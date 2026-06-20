-- Platform admin complete — audit log, alerts, extended settings (run after 004)

-- ---------------------------------------------------------------------------
-- Extended platform_settings
-- ---------------------------------------------------------------------------
ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS support_email TEXT DEFAULT 'support@mycarta.dz',
  ADD COLUMN IF NOT EXISTS maintenance_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_banner TEXT DEFAULT '';

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_created ON platform_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_tenant ON platform_audit_log(target_tenant_id);

ALTER TABLE platform_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_audit_super_admin ON platform_audit_log;
CREATE POLICY platform_audit_super_admin ON platform_audit_log
  FOR SELECT TO authenticated
  USING (is_super_admin());

-- ---------------------------------------------------------------------------
-- Helper: log platform action
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_platform_action(
  p_action TEXT,
  p_target_tenant_id UUID DEFAULT NULL,
  p_meta JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO platform_audit_log (actor_id, action, target_tenant_id, meta)
  VALUES (auth.uid(), p_action, p_target_tenant_id, COALESCE(p_meta, '{}'::jsonb));
END;
$$;

-- ---------------------------------------------------------------------------
-- Alerts dashboard
-- ---------------------------------------------------------------------------
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
          'type', 'receipt_pending',
          'priority', 2,
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
          'priority', 3,
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

-- ---------------------------------------------------------------------------
-- Audit log list
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_platform_audit_log(p_limit INT DEFAULT 50)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x."createdAt" DESC), '[]'::jsonb)
    FROM (
      SELECT
        l.id,
        l.action,
        l.meta,
        l.created_at AS "createdAt",
        l.target_tenant_id AS "targetTenantId",
        t.name AS "targetTenantName",
        p.full_name AS "actorName",
        p.email AS "actorEmail"
      FROM platform_audit_log l
      LEFT JOIN tenants t ON t.id = l.target_tenant_id
      LEFT JOIN profiles p ON p.id = l.actor_id
      ORDER BY l.created_at DESC
      LIMIT LEAST(p_limit, 200)
    ) x
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Patch overview with P4 metrics
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_platform_overview()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_base JSONB;
  v_signups JSONB;
  v_scans JSONB;
  v_enrolments JSONB;
  v_revenue_month JSONB;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', to_char(d, 'YYYY-MM-DD'), 'count', c) ORDER BY d), '[]'::jsonb)
  INTO v_signups FROM (
    SELECT date_trunc('day', created_at) AS d, count(*)::int AS c
    FROM tenants WHERE created_at >= now() - interval '30 days' GROUP BY 1
  ) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', to_char(d, 'YYYY-MM-DD'), 'count', c) ORDER BY d), '[]'::jsonb)
  INTO v_scans FROM (
    SELECT date_trunc('day', scanned_at) AS d, count(*)::int AS c
    FROM scan_logs WHERE scanned_at >= now() - interval '30 days' AND status = 'approved' GROUP BY 1
  ) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', to_char(d, 'YYYY-MM-DD'), 'count', c) ORDER BY d), '[]'::jsonb)
  INTO v_enrolments FROM (
    SELECT date_trunc('day', enrolled_at) AS d, count(*)::int AS c
    FROM clients WHERE enrolled_at >= now() - interval '30 days' GROUP BY 1
  ) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', to_char(d, 'YYYY-MM-DD'), 'amountDzd', amt) ORDER BY d), '[]'::jsonb)
  INTO v_revenue_month FROM (
    SELECT date_trunc('day', created_at) AS d, sum(amount_dzd)::int AS amt
    FROM payment_receipts WHERE status = 'approved' AND created_at >= now() - interval '30 days'
    GROUP BY 1
  ) r;

  v_base :=
    jsonb_build_object(
    'totalTenants', (SELECT count(*)::int FROM tenants),
    'trialingTenants', (SELECT count(*)::int FROM tenants WHERE subscription_status = 'trialing'),
    'activeTenants', (SELECT count(*)::int FROM tenants WHERE subscription_status = 'active'),
    'pastDueTenants', (SELECT count(*)::int FROM tenants WHERE subscription_status = 'past_due'),
    'canceledTenants', (SELECT count(*)::int FROM tenants WHERE subscription_status = 'canceled'),
    'expiredTenants', (SELECT count(*)::int FROM tenants WHERE subscription_status IN ('expired', 'past_due', 'canceled')),
    'newTenantsToday', (SELECT count(*)::int FROM tenants WHERE created_at >= date_trunc('day', now())),
    'newTenantsThisWeek', (SELECT count(*)::int FROM tenants WHERE created_at >= date_trunc('week', now())),
    'newTenantsThisMonth', (SELECT count(*)::int FROM tenants WHERE created_at >= date_trunc('month', now())),
    'trialExpiring7d', (
      SELECT count(*)::int FROM tenants
      WHERE subscription_status = 'trialing' AND trial_ends_at IS NOT NULL
        AND trial_ends_at <= now() + interval '7 days' AND trial_ends_at > now()
    ),
    'onboardingCompleteCount', (SELECT count(*)::int FROM tenants WHERE onboarding_complete = true),
    'tutorialCompleteCount', (SELECT count(*)::int FROM tenants WHERE dashboard_tutorial_complete = true),
    'totalClients', (SELECT count(*)::int FROM clients),
    'activeCards', (SELECT count(*)::int FROM clients WHERE is_blocked = false),
    'blockedCards', (SELECT count(*)::int FROM clients WHERE is_blocked = true),
    'clientsEnrolledToday', (SELECT count(*)::int FROM clients WHERE enrolled_at >= date_trunc('day', now())),
    'clientsEnrolledThisWeek', (SELECT count(*)::int FROM clients WHERE enrolled_at >= date_trunc('week', now())),
    'clientsEnrolledThisMonth', (SELECT count(*)::int FROM clients WHERE enrolled_at >= date_trunc('month', now())),
    'totalScans', (SELECT count(*)::int FROM scan_logs WHERE status = 'approved'),
    'scansToday', (SELECT count(*)::int FROM scan_logs WHERE scanned_at >= date_trunc('day', now()) AND status = 'approved'),
    'scansThisWeek', (SELECT count(*)::int FROM scan_logs WHERE scanned_at >= date_trunc('week', now()) AND status = 'approved'),
    'scansThisMonth', (SELECT count(*)::int FROM scan_logs WHERE scanned_at >= date_trunc('month', now()) AND status = 'approved'),
    'fraudScansTotal', (SELECT count(*)::int FROM scan_logs WHERE status != 'approved'),
    'fraudScansToday', (SELECT count(*)::int FROM scan_logs WHERE scanned_at >= date_trunc('day', now()) AND status != 'approved'),
    'totalRewards', (SELECT count(*)::int FROM rewards),
    'rewardsRedeemed', (SELECT count(*)::int FROM rewards WHERE redeemed_at IS NOT NULL),
    'rewardsPending', (SELECT count(*)::int FROM rewards WHERE redeemed_at IS NULL),
    'totalWorkers', (SELECT count(*)::int FROM profiles WHERE role = 'worker'),
    'activeWorkers', (SELECT count(*)::int FROM profiles WHERE role = 'worker' AND is_active = true),
    'totalOwners', (SELECT count(*)::int FROM profiles WHERE role = 'owner'),
    'totalProducts', (SELECT count(*)::int FROM products),
    'activeProducts', (SELECT count(*)::int FROM products WHERE is_active = true),
    'totalCampaigns', (SELECT count(*)::int FROM campaigns),
    'pendingReceipts', (SELECT count(*)::int FROM payment_receipts WHERE status = 'pending'),
    'approvedReceipts', (SELECT count(*)::int FROM payment_receipts WHERE status = 'approved'),
    'rejectedReceipts', (SELECT count(*)::int FROM payment_receipts WHERE status = 'rejected'),
    'activeSubscriptions', (SELECT count(*)::int FROM subscriptions WHERE status = 'active'),
    'pendingSubscriptions', (SELECT count(*)::int FROM subscriptions WHERE status = 'pending'),
    'estimatedMrrDzd', (
      SELECT COALESCE(sum(p.price_monthly_dzd), 0)::int FROM tenants t
      JOIN plans p ON p.id = t.plan_id WHERE t.subscription_status = 'active' AND p.price_monthly_dzd IS NOT NULL
    ),
    'estimatedArrDzd', (
      SELECT COALESCE(sum(p.price_monthly_dzd), 0)::int * 12 FROM tenants t
      JOIN plans p ON p.id = t.plan_id WHERE t.subscription_status = 'active' AND p.price_monthly_dzd IS NOT NULL
    ),
    'revenueApprovedTotalDzd', (SELECT COALESCE(sum(amount_dzd), 0)::int FROM payment_receipts WHERE status = 'approved'),
    'revenueApprovedThisMonthDzd', (
      SELECT COALESCE(sum(amount_dzd), 0)::int FROM payment_receipts
      WHERE status = 'approved' AND created_at >= date_trunc('month', now())
    ),
    'chargilyPaymentsCount', (
      SELECT count(*)::int FROM subscriptions WHERE chargily_payment_id IS NOT NULL AND status = 'active'
    ),
    'baridimobPaymentsCount', (
      SELECT count(*)::int FROM payment_receipts WHERE status = 'approved' AND payment_method IN ('baridimob', 'ccp', 'cib')
    )
    )
    || jsonb_build_object(
    'avgClientsPerTenant', (
      SELECT CASE WHEN count(*) > 0 THEN round((SELECT count(*)::numeric FROM clients) / count(*), 1) ELSE 0 END FROM tenants
    ),
    'avgScansPerTenant', (
      SELECT CASE WHEN count(*) > 0 THEN round((SELECT count(*)::numeric FROM scan_logs WHERE status = 'approved') / count(*), 1) ELSE 0 END FROM tenants
    ),
    'avgWorkersPerTenant', (
      SELECT CASE WHEN count(*) > 0 THEN round((SELECT count(*)::numeric FROM profiles WHERE role = 'worker' AND is_active = true) / count(*), 1) ELSE 0 END FROM tenants
    ),
    'onboardingRate', (
      SELECT CASE WHEN count(*) > 0 THEN round(100.0 * count(*) FILTER (WHERE onboarding_complete) / count(*), 1) ELSE 0 END FROM tenants
    ),
    'trialToPaidRate', (
      SELECT CASE WHEN count(*) > 0 THEN round(100.0 * count(*) FILTER (WHERE subscription_status = 'active' AND plan_id != 'trial') / count(*), 1) ELSE 0 END FROM tenants
    ),
    'fraudRate', (
      SELECT CASE WHEN count(*) > 0 THEN round(100.0 * count(*) FILTER (WHERE status != 'approved') / count(*), 2) ELSE 0 END FROM scan_logs
    ),
    'rewardRedemptionRate', (
      SELECT CASE WHEN count(*) > 0 THEN round(100.0 * count(*) FILTER (WHERE redeemed_at IS NOT NULL) / count(*), 1) ELSE 0 END FROM rewards
    ),
    'monthlyChurnCount', (
      SELECT count(*)::int FROM tenants
      WHERE subscription_status = 'canceled'
        AND updated_at >= date_trunc('month', now())
    ),
    'tenantsByPlan', (
      SELECT COALESCE(jsonb_object_agg(plan_id, cnt), '{}'::jsonb)
      FROM (SELECT plan_id, count(*)::int AS cnt FROM tenants GROUP BY plan_id) x
    ),
    'tenantsByStatus', (
      SELECT COALESCE(jsonb_object_agg(subscription_status, cnt), '{}'::jsonb)
      FROM (SELECT subscription_status, count(*)::int AS cnt FROM tenants GROUP BY subscription_status) x
    ),
    'mrrByPlan', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'planId', sub.plan_id, 'planName', p.name, 'tenantCount', sub.cnt, 'mrrDzd', sub.mrr
      ) ORDER BY sub.mrr DESC), '[]'::jsonb)
      FROM (
        SELECT t.plan_id, count(*)::int AS cnt, COALESCE(sum(p.price_monthly_dzd), 0)::int AS mrr
        FROM tenants t JOIN plans p ON p.id = t.plan_id
        WHERE t.subscription_status = 'active' GROUP BY t.plan_id
      ) sub JOIN plans p ON p.id = sub.plan_id
    ),
    'signupsByDay', v_signups,
    'scansByDay', v_scans,
    'enrolmentsByDay', v_enrolments,
    'revenueByDay', v_revenue_month
  );

  RETURN v_base;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_audit_log(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_platform_action(TEXT, UUID, JSONB) TO authenticated;
