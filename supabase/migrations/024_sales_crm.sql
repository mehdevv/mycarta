-- Sales rep CRM: role, follow-ups, commissions, billing identity, signup phone

-- ---------------------------------------------------------------------------
-- Profiles: phone + sales_rep role
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'worker', 'super_admin', 'sales_rep'));

-- ---------------------------------------------------------------------------
-- Tenants: owner phone, billing identity, assigned rep
-- ---------------------------------------------------------------------------
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS owner_phone TEXT,
  ADD COLUMN IF NOT EXISTS billing_full_name TEXT,
  ADD COLUMN IF NOT EXISTS billing_phone TEXT,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS billing_address TEXT,
  ADD COLUMN IF NOT EXISTS assigned_sales_rep_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_assigned_rep ON tenants(assigned_sales_rep_id);

-- ---------------------------------------------------------------------------
-- Platform commission rates per plan
-- ---------------------------------------------------------------------------
ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS commission_rate_boutique NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS commission_rate_maison NUMERIC(5,2) NOT NULL DEFAULT 12.00,
  ADD COLUMN IF NOT EXISTS commission_rate_prestige NUMERIC(5,2) NOT NULL DEFAULT 15.00;

-- ---------------------------------------------------------------------------
-- Sales follow-ups (one row per tenant)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  rep_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'negotiating', 'won', 'lost', 'renewed')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  next_follow_up_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  notes TEXT,
  upsell_plan_id TEXT REFERENCES plans(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_follow_ups_rep ON sales_follow_ups(rep_id);
CREATE INDEX IF NOT EXISTS idx_sales_follow_ups_next ON sales_follow_ups(next_follow_up_at);
CREATE INDEX IF NOT EXISTS idx_sales_follow_ups_status ON sales_follow_ups(status);

-- ---------------------------------------------------------------------------
-- Sales commissions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  amount_dzd INT NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL,
  commission_dzd INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'paid')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_commissions_rep ON sales_commissions(rep_id);
CREATE INDEX IF NOT EXISTS idx_sales_commissions_tenant ON sales_commissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_commissions_status ON sales_commissions(status);

-- ---------------------------------------------------------------------------
-- Auth helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_sales_rep()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'sales_rep'
      AND tenant_id IS NULL
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_commission_rate_for_plan(p_plan_id TEXT)
RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE p_plan_id
    WHEN 'boutique' THEN (SELECT commission_rate_boutique FROM platform_settings WHERE id = 'default')
    WHEN 'maison' THEN (SELECT commission_rate_maison FROM platform_settings WHERE id = 'default')
    WHEN 'prestige' THEN (SELECT commission_rate_prestige FROM platform_settings WHERE id = 'default')
    ELSE 10.00
  END;
$$;

CREATE OR REPLACE FUNCTION public.create_sales_commission_for_subscription(
  p_tenant_id UUID,
  p_subscription_id UUID,
  p_plan_id TEXT,
  p_amount_dzd INT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rep_id UUID;
  v_rate NUMERIC(5,2);
  v_commission INT;
BEGIN
  SELECT assigned_sales_rep_id INTO v_rep_id
  FROM tenants WHERE id = p_tenant_id;

  IF v_rep_id IS NULL THEN
    RETURN;
  END IF;

  v_rate := get_commission_rate_for_plan(p_plan_id);
  v_commission := round(p_amount_dzd * v_rate / 100.0)::int;

  INSERT INTO sales_commissions (
    rep_id, tenant_id, subscription_id, plan_id,
    amount_dzd, commission_rate, commission_dzd, status
  ) VALUES (
    v_rep_id, p_tenant_id, p_subscription_id, p_plan_id,
    p_amount_dzd, v_rate, v_commission, 'pending'
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE sales_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_follow_ups_rep ON sales_follow_ups;
CREATE POLICY sales_follow_ups_rep ON sales_follow_ups
  FOR ALL TO authenticated
  USING (is_super_admin() OR (is_sales_rep() AND rep_id = auth.uid()))
  WITH CHECK (is_super_admin() OR (is_sales_rep() AND rep_id = auth.uid()));

DROP POLICY IF EXISTS sales_commissions_rep ON sales_commissions;
CREATE POLICY sales_commissions_rep ON sales_commissions
  FOR SELECT TO authenticated
  USING (is_super_admin() OR (is_sales_rep() AND rep_id = auth.uid()));

DROP POLICY IF EXISTS sales_commissions_super_update ON sales_commissions;
CREATE POLICY sales_commissions_super_update ON sales_commissions
  FOR UPDATE TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS tenants_owner_billing_update ON tenants;
CREATE POLICY tenants_owner_billing_update ON tenants
  FOR UPDATE TO authenticated
  USING (is_super_admin() OR (is_tenant_owner() AND id = get_my_tenant_id()))
  WITH CHECK (is_super_admin() OR (is_tenant_owner() AND id = get_my_tenant_id()));

-- ---------------------------------------------------------------------------
-- Owner billing details update
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_tenant_billing_details(
  p_full_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  IF NOT is_tenant_owner() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_tenant_id := get_my_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant';
  END IF;

  IF trim(coalesce(p_full_name, '')) = '' OR trim(coalesce(p_phone, '')) = '' OR trim(coalesce(p_email, '')) = '' THEN
    RAISE EXCEPTION 'Nom, téléphone et email requis';
  END IF;

  UPDATE tenants SET
    billing_full_name = trim(p_full_name),
    billing_phone = trim(p_phone),
    billing_email = trim(p_email),
    billing_address = nullif(trim(coalesce(p_address, '')), ''),
    updated_at = now()
  WHERE id = v_tenant_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Sales rep pipeline
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_sales_rep_pipeline()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rep_id UUID := auth.uid();
BEGIN
  IF NOT is_sales_rep() AND NOT is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF is_super_admin() THEN
  RETURN (
    SELECT coalesce(jsonb_agg(row_to_json(x) ORDER BY x.urgency_days ASC NULLS LAST, x.next_follow_up_at ASC NULLS LAST), '[]'::jsonb)
    FROM (
      SELECT
        t.id AS tenant_id,
        t.slug,
        t.name AS business_name,
        t.plan_id,
        t.subscription_status,
        t.trial_ends_at,
        t.subscription_ends_at,
        t.owner_phone,
        t.billing_full_name,
        t.billing_phone,
        t.billing_email,
        t.assigned_sales_rep_id AS rep_id,
        p.full_name AS owner_name,
        p.email AS owner_email,
        p.phone AS owner_profile_phone,
        f.id AS follow_up_id,
        coalesce(f.status, 'new') AS status,
        coalesce(f.priority, 'normal') AS priority,
        f.next_follow_up_at,
        f.last_contact_at,
        f.notes,
        f.upsell_plan_id,
        CASE
          WHEN t.subscription_status = 'trialing' AND t.trial_ends_at IS NOT NULL
            THEN greatest(0, extract(day FROM t.trial_ends_at - now()))::int
          WHEN t.subscription_ends_at IS NOT NULL
            THEN greatest(0, extract(day FROM t.subscription_ends_at - now()))::int
          ELSE NULL
        END AS urgency_days
      FROM tenants t
      LEFT JOIN profiles p ON p.tenant_id = t.id AND p.role = 'owner'
      LEFT JOIN sales_follow_ups f ON f.tenant_id = t.id
      WHERE t.assigned_sales_rep_id IS NOT NULL
    ) x
  );
  END IF;

  RETURN (
    SELECT coalesce(jsonb_agg(row_to_json(x) ORDER BY x.urgency_days ASC NULLS LAST, x.next_follow_up_at ASC NULLS LAST), '[]'::jsonb)
    FROM (
      SELECT
        t.id AS tenant_id,
        t.slug,
        t.name AS business_name,
        t.plan_id,
        t.subscription_status,
        t.trial_ends_at,
        t.subscription_ends_at,
        t.owner_phone,
        t.billing_full_name,
        t.billing_phone,
        t.billing_email,
        t.assigned_sales_rep_id AS rep_id,
        p.full_name AS owner_name,
        p.email AS owner_email,
        p.phone AS owner_profile_phone,
        f.id AS follow_up_id,
        coalesce(f.status, 'new') AS status,
        coalesce(f.priority, 'normal') AS priority,
        f.next_follow_up_at,
        f.last_contact_at,
        f.notes,
        f.upsell_plan_id,
        CASE
          WHEN t.subscription_status = 'trialing' AND t.trial_ends_at IS NOT NULL
            THEN greatest(0, extract(day FROM t.trial_ends_at - now()))::int
          WHEN t.subscription_ends_at IS NOT NULL
            THEN greatest(0, extract(day FROM t.subscription_ends_at - now()))::int
          ELSE NULL
        END AS urgency_days
      FROM tenants t
      LEFT JOIN profiles p ON p.tenant_id = t.id AND p.role = 'owner'
      LEFT JOIN sales_follow_ups f ON f.tenant_id = t.id
      WHERE t.assigned_sales_rep_id = v_rep_id
    ) x
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_sales_follow_up(
  p_tenant_id UUID,
  p_status TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_next_follow_up_at TIMESTAMPTZ DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_upsell_plan_id TEXT DEFAULT NULL,
  p_mark_contacted BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rep_id UUID;
  v_assigned_rep UUID;
  v_follow_up sales_follow_ups%ROWTYPE;
  v_next TIMESTAMPTZ;
BEGIN
  SELECT assigned_sales_rep_id INTO v_assigned_rep FROM tenants WHERE id = p_tenant_id;
  IF v_assigned_rep IS NULL THEN
    RAISE EXCEPTION 'Tenant has no assigned rep';
  END IF;

  IF is_sales_rep() THEN
    IF v_assigned_rep <> auth.uid() THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
    v_rep_id := auth.uid();
  ELSIF is_super_admin() THEN
    v_rep_id := v_assigned_rep;
  ELSE
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO v_follow_up FROM sales_follow_ups WHERE tenant_id = p_tenant_id;

  v_next := COALESCE(p_next_follow_up_at, v_follow_up.next_follow_up_at);

  IF v_follow_up.id IS NULL THEN
    INSERT INTO sales_follow_ups (
      tenant_id, rep_id, status, priority, next_follow_up_at, notes, upsell_plan_id,
      last_contact_at
    ) VALUES (
      p_tenant_id,
      v_rep_id,
      coalesce(p_status, 'new'),
      coalesce(p_priority, 'normal'),
      v_next,
      p_notes,
      p_upsell_plan_id,
      CASE WHEN p_mark_contacted THEN now() ELSE NULL END
    )
    RETURNING * INTO v_follow_up;
  ELSE
    UPDATE sales_follow_ups SET
      status = coalesce(p_status, status),
      priority = coalesce(p_priority, priority),
      next_follow_up_at = v_next,
      notes = coalesce(p_notes, notes),
      upsell_plan_id = coalesce(p_upsell_plan_id, upsell_plan_id),
      last_contact_at = CASE WHEN p_mark_contacted THEN now() ELSE last_contact_at END,
      updated_at = now()
    WHERE tenant_id = p_tenant_id
    RETURNING * INTO v_follow_up;
  END IF;

  RETURN to_jsonb(v_follow_up);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_sales_rep_commissions()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_sales_rep() AND NOT is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN (
    SELECT coalesce(jsonb_agg(row_to_json(x) ORDER BY x.created_at DESC), '[]'::jsonb)
    FROM (
      SELECT
        c.*,
        t.name AS business_name,
        t.slug
      FROM sales_commissions c
      JOIN tenants t ON t.id = c.tenant_id
      WHERE is_super_admin() OR c.rep_id = auth.uid()
    ) x
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_sales_reps()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN (
    SELECT coalesce(jsonb_agg(row_to_json(x) ORDER BY x.created_at DESC), '[]'::jsonb)
    FROM (
      SELECT
        p.id,
        p.full_name,
        p.email,
        p.phone,
        p.is_active,
        p.created_at,
        (SELECT count(*)::int FROM tenants t WHERE t.assigned_sales_rep_id = p.id) AS tenant_count,
        (SELECT coalesce(sum(commission_dzd), 0)::int FROM sales_commissions c WHERE c.rep_id = p.id AND c.status = 'pending') AS pending_commission_dzd
      FROM profiles p
      WHERE p.role = 'sales_rep'
    ) x
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_tenant_sales_rep(
  p_tenant_id UUID,
  p_rep_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant tenants%ROWTYPE;
  v_next TIMESTAMPTZ;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_rep_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_rep_id AND role = 'sales_rep' AND is_active) THEN
      RAISE EXCEPTION 'Invalid sales rep';
    END IF;
  END IF;

  UPDATE tenants SET
    assigned_sales_rep_id = p_rep_id,
    updated_at = now()
  WHERE id = p_tenant_id
  RETURNING * INTO v_tenant;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  IF p_rep_id IS NOT NULL THEN
    v_next := coalesce(v_tenant.trial_ends_at, v_tenant.subscription_ends_at, now() + interval '3 days');

    INSERT INTO sales_follow_ups (tenant_id, rep_id, status, priority, next_follow_up_at)
    VALUES (p_tenant_id, p_rep_id, 'new', 'normal', v_next)
    ON CONFLICT (tenant_id) DO UPDATE SET
      rep_id = EXCLUDED.rep_id,
      updated_at = now();
  ELSE
    DELETE FROM sales_follow_ups WHERE tenant_id = p_tenant_id;
  END IF;

  PERFORM log_platform_action('assign_sales_rep', p_tenant_id, jsonb_build_object('rep_id', p_rep_id));

  RETURN jsonb_build_object('success', true, 'tenantId', p_tenant_id, 'repId', p_rep_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_sales_commission_status(
  p_commission_id UUID,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_status NOT IN ('pending', 'approved', 'paid') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE sales_commissions SET status = p_status, updated_at = now() WHERE id = p_commission_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Extend platform alerts with paid subscription expiry
CREATE OR REPLACE FUNCTION public.get_platform_alerts()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN jsonb_build_object(
    'trialExpiring3d', (
      SELECT count(*)::int FROM tenants
      WHERE subscription_status = 'trialing'
        AND trial_ends_at IS NOT NULL
        AND trial_ends_at <= now() + interval '3 days'
        AND trial_ends_at > now()
    ),
    'trialExpiring7d', (
      SELECT count(*)::int FROM tenants
      WHERE subscription_status = 'trialing'
        AND trial_ends_at IS NOT NULL
        AND trial_ends_at <= now() + interval '7 days'
        AND trial_ends_at > now()
    ),
    'subscriptionExpiring7d', (
      SELECT count(*)::int FROM tenants
      WHERE subscription_status = 'active'
        AND subscription_ends_at IS NOT NULL
        AND subscription_ends_at <= now() + interval '7 days'
        AND subscription_ends_at > now()
    ),
    'subscriptionExpiring30d', (
      SELECT count(*)::int FROM tenants
      WHERE subscription_status = 'active'
        AND subscription_ends_at IS NOT NULL
        AND subscription_ends_at <= now() + interval '30 days'
        AND subscription_ends_at > now()
    ),
    'pendingReceiptsOver48h', (
      SELECT count(*)::int FROM payment_receipts
      WHERE status = 'pending' AND created_at < now() - interval '48 hours'
    ),
    'inactiveTenants14d', (
      SELECT count(*)::int FROM tenants t
      WHERE NOT EXISTS (
        SELECT 1 FROM scan_logs s
        WHERE s.tenant_id = t.id AND s.scanned_at >= now() - interval '14 days'
      )
      AND t.subscription_status IN ('trialing', 'active')
    ),
    'items', (
      SELECT COALESCE(jsonb_agg(item ORDER BY (item->>'priority')::int), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'type', 'trial_expiring',
          'priority', 1,
          'tenantId', t.id,
          'tenantName', t.name,
          'tenantSlug', t.slug,
          'message', 'Essai expire le ' || to_char(t.trial_ends_at, 'DD/MM/YYYY'),
          'trialEndsAt', t.trial_ends_at
        ) AS item
        FROM tenants t
        WHERE t.subscription_status = 'trialing'
          AND t.trial_ends_at IS NOT NULL
          AND t.trial_ends_at <= now() + interval '7 days'
          AND t.trial_ends_at > now()
        UNION ALL
        SELECT jsonb_build_object(
          'type', 'subscription_expiring',
          'priority', 2,
          'tenantId', t.id,
          'tenantName', t.name,
          'tenantSlug', t.slug,
          'message', 'Abonnement expire le ' || to_char(t.subscription_ends_at, 'DD/MM/YYYY')
        )
        FROM tenants t
        WHERE t.subscription_status = 'active'
          AND t.subscription_ends_at IS NOT NULL
          AND t.subscription_ends_at <= now() + interval '30 days'
          AND t.subscription_ends_at > now()
        UNION ALL
        SELECT jsonb_build_object(
          'type', 'receipt_pending',
          'priority', 3,
          'receiptId', r.id,
          'tenantId', r.tenant_id,
          'tenantName', tn.name,
          'message', 'Reçu en attente depuis ' || round(extract(epoch FROM now() - r.created_at) / 3600)::int || 'h',
          'amountDzd', r.amount_dzd,
          'createdAt', r.created_at
        )
        FROM payment_receipts r
        JOIN tenants tn ON tn.id = r.tenant_id
        WHERE r.status = 'pending' AND r.created_at < now() - interval '48 hours'
        UNION ALL
        SELECT jsonb_build_object(
          'type', 'inactive_tenant',
          'priority', 4,
          'tenantId', t.id,
          'tenantName', t.name,
          'tenantSlug', t.slug,
          'message', 'Aucun scan depuis 14+ jours',
          'daysSinceLastScan', (
            SELECT CASE WHEN max(s.scanned_at) IS NULL THEN NULL
              ELSE extract(day FROM now() - max(s.scanned_at))::int END
            FROM scan_logs s WHERE s.tenant_id = t.id
          )
        )
        FROM tenants t
        WHERE t.subscription_status IN ('trialing', 'active')
          AND NOT EXISTS (
            SELECT 1 FROM scan_logs s
            WHERE s.tenant_id = t.id AND s.scanned_at >= now() - interval '14 days'
          )
      ) alerts
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_sales_rep() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_commission_rate_for_plan(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sales_commission_for_subscription(UUID, UUID, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_tenant_billing_details(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_rep_pipeline() TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_sales_follow_up(UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_rep_commissions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_sales_reps() TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_tenant_sales_rep(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_sales_commission_status(UUID, TEXT) TO authenticated;
