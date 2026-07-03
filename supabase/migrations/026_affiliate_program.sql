-- Affiliate program: creator referral codes, discounted pricing, commissions

-- ---------------------------------------------------------------------------
-- Profiles: affiliate role + code
-- ---------------------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS affiliate_code TEXT,
  ADD COLUMN IF NOT EXISTS social_handle TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_affiliate_code
  ON profiles(upper(affiliate_code))
  WHERE affiliate_code IS NOT NULL;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'worker', 'super_admin', 'sales_rep', 'affiliate'));

-- ---------------------------------------------------------------------------
-- Tenants: affiliate attribution
-- ---------------------------------------------------------------------------
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS referred_affiliate_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS affiliate_code_used TEXT,
  ADD COLUMN IF NOT EXISTS affiliate_first_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS affiliate_benefit_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS affiliate_commission_payments_count INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tenants_referred_affiliate ON tenants(referred_affiliate_id);

-- ---------------------------------------------------------------------------
-- Platform affiliate prices + commission rates
-- ---------------------------------------------------------------------------
ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS affiliate_price_boutique_monthly INT NOT NULL DEFAULT 2320,
  ADD COLUMN IF NOT EXISTS affiliate_price_boutique_annual INT NOT NULL DEFAULT 23200,
  ADD COLUMN IF NOT EXISTS affiliate_price_maison_monthly INT NOT NULL DEFAULT 4320,
  ADD COLUMN IF NOT EXISTS affiliate_price_maison_annual INT NOT NULL DEFAULT 43200,
  ADD COLUMN IF NOT EXISTS affiliate_commission_rate_boutique NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  ADD COLUMN IF NOT EXISTS affiliate_commission_rate_maison NUMERIC(5,2) NOT NULL DEFAULT 18.00;

-- ---------------------------------------------------------------------------
-- Affiliate commissions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  amount_dzd INT NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL,
  commission_dzd INT NOT NULL,
  payment_period INT NOT NULL CHECK (payment_period BETWEEN 1 AND 3),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'paid')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_commissions_subscription
  ON affiliate_commissions(subscription_id)
  WHERE subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate ON affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_tenant ON affiliate_commissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_status ON affiliate_commissions(status);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_affiliate()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'affiliate'
      AND tenant_id IS NULL
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_affiliate_price_for_plan(
  p_plan_id TEXT,
  p_billing_period TEXT
)
RETURNS INT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN p_plan_id = 'boutique' AND p_billing_period = 'annual'
      THEN (SELECT affiliate_price_boutique_annual FROM platform_settings WHERE id = 'default')
    WHEN p_plan_id = 'boutique'
      THEN (SELECT affiliate_price_boutique_monthly FROM platform_settings WHERE id = 'default')
    WHEN p_plan_id = 'maison' AND p_billing_period = 'annual'
      THEN (SELECT affiliate_price_maison_annual FROM platform_settings WHERE id = 'default')
    WHEN p_plan_id = 'maison'
      THEN (SELECT affiliate_price_maison_monthly FROM platform_settings WHERE id = 'default')
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_affiliate_commission_rate_for_plan(p_plan_id TEXT)
RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE p_plan_id
    WHEN 'boutique' THEN (SELECT affiliate_commission_rate_boutique FROM platform_settings WHERE id = 'default')
    WHEN 'maison' THEN (SELECT affiliate_commission_rate_maison FROM platform_settings WHERE id = 'default')
    ELSE 15.00
  END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_affiliate_pricing_eligible(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenants t
    JOIN profiles p ON p.id = t.referred_affiliate_id
    WHERE t.id = p_tenant_id
      AND t.referred_affiliate_id IS NOT NULL
      AND p.role = 'affiliate'
      AND p.is_active = true
      AND (
        t.affiliate_first_paid_at IS NULL
        OR (
          t.affiliate_benefit_ends_at IS NOT NULL
          AND t.affiliate_benefit_ends_at > now()
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_affiliate_by_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row RECORD;
BEGIN
  IF trim(coalesce(p_code, '')) = '' THEN
    RETURN NULL;
  END IF;

  SELECT id, full_name, affiliate_code, social_handle
  INTO v_row
  FROM profiles
  WHERE upper(affiliate_code) = upper(trim(p_code))
    AND role = 'affiliate'
    AND is_active = true
    AND tenant_id IS NULL;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'fullName', v_row.full_name,
    'affiliateCode', v_row.affiliate_code,
    'socialHandle', v_row.social_handle
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_tenant_affiliate_pricing(
  p_tenant_id UUID,
  p_plan_id TEXT,
  p_billing_period TEXT
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant tenants%ROWTYPE;
  v_list_price INT;
  v_affiliate_price INT;
  v_eligible BOOLEAN;
BEGIN
  SELECT * INTO v_tenant FROM tenants WHERE id = p_tenant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'tenant_not_found');
  END IF;

  SELECT CASE
    WHEN p_billing_period = 'annual' THEN price_annual_dzd
    ELSE price_monthly_dzd
  END INTO v_list_price
  FROM plans WHERE id = p_plan_id;

  v_affiliate_price := get_affiliate_price_for_plan(p_plan_id, p_billing_period);
  v_eligible := tenant_affiliate_pricing_eligible(p_tenant_id);

  IF NOT v_eligible OR v_affiliate_price IS NULL THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'amountDzd', v_list_price,
      'listPriceDzd', v_list_price,
      'affiliateCode', v_tenant.affiliate_code_used,
      'reason', CASE
        WHEN v_tenant.referred_affiliate_id IS NULL THEN 'no_referral'
        WHEN v_tenant.affiliate_benefit_ends_at IS NOT NULL AND v_tenant.affiliate_benefit_ends_at <= now() THEN 'benefit_expired'
        ELSE 'not_eligible'
      END
    );
  END IF;

  RETURN jsonb_build_object(
    'eligible', true,
    'amountDzd', v_affiliate_price,
    'listPriceDzd', v_list_price,
    'affiliateCode', v_tenant.affiliate_code_used,
    'benefitEndsAt', v_tenant.affiliate_benefit_ends_at,
    'commissionPaymentsCount', v_tenant.affiliate_commission_payments_count,
    'reason', 'affiliate_discount'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.start_tenant_affiliate_benefit(p_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE tenants SET
    affiliate_first_paid_at = coalesce(affiliate_first_paid_at, now()),
    affiliate_benefit_ends_at = coalesce(affiliate_benefit_ends_at, now() + interval '3 months'),
    updated_at = now()
  WHERE id = p_tenant_id
    AND referred_affiliate_id IS NOT NULL
    AND affiliate_first_paid_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_affiliate_commission_for_subscription(
  p_tenant_id UUID,
  p_subscription_id UUID,
  p_plan_id TEXT,
  p_amount_dzd INT,
  p_billing_period TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant tenants%ROWTYPE;
  v_rate NUMERIC(5,2);
  v_commission_base INT;
  v_commission INT;
  v_period INT;
  v_payments_to_add INT;
BEGIN
  IF p_subscription_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM affiliate_commissions WHERE subscription_id = p_subscription_id
  ) THEN
    RETURN;
  END IF;

  SELECT * INTO v_tenant FROM tenants WHERE id = p_tenant_id;
  IF v_tenant.referred_affiliate_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = v_tenant.referred_affiliate_id
      AND role = 'affiliate'
      AND is_active = true
  ) THEN
    RETURN;
  END IF;

  IF v_tenant.affiliate_commission_payments_count >= 3 THEN
    RETURN;
  END IF;

  IF v_tenant.affiliate_benefit_ends_at IS NOT NULL AND v_tenant.affiliate_benefit_ends_at <= now() THEN
    RETURN;
  END IF;

  v_rate := get_affiliate_commission_rate_for_plan(p_plan_id);
  v_period := v_tenant.affiliate_commission_payments_count + 1;

  IF p_billing_period = 'annual' THEN
    v_commission_base := coalesce(get_affiliate_price_for_plan(p_plan_id, 'monthly'), 0) * 3;
    v_payments_to_add := 3;
  ELSE
    v_commission_base := p_amount_dzd;
    v_payments_to_add := 1;
  END IF;

  v_commission := round(v_commission_base * v_rate / 100.0)::int;

  INSERT INTO affiliate_commissions (
    affiliate_id, tenant_id, subscription_id, plan_id,
    amount_dzd, commission_rate, commission_dzd, payment_period, status
  ) VALUES (
    v_tenant.referred_affiliate_id, p_tenant_id, p_subscription_id, p_plan_id,
    v_commission_base, v_rate, v_commission, v_period, 'pending'
  );

  UPDATE tenants SET
    affiliate_commission_payments_count = least(3, affiliate_commission_payments_count + v_payments_to_add),
    updated_at = now()
  WHERE id = p_tenant_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS affiliate_commissions_affiliate ON affiliate_commissions;
CREATE POLICY affiliate_commissions_affiliate ON affiliate_commissions
  FOR SELECT TO authenticated
  USING (is_super_admin() OR (is_affiliate() AND affiliate_id = auth.uid()));

DROP POLICY IF EXISTS affiliate_commissions_super_update ON affiliate_commissions;
CREATE POLICY affiliate_commissions_super_update ON affiliate_commissions
  FOR UPDATE TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ---------------------------------------------------------------------------
-- Affiliate dashboard RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_affiliates()
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
        p.affiliate_code,
        p.social_handle,
        p.is_active,
        p.created_at,
        (SELECT count(*)::int FROM tenants t WHERE t.referred_affiliate_id = p.id) AS signup_count,
        (SELECT count(*)::int FROM tenants t
          WHERE t.referred_affiliate_id = p.id AND t.affiliate_first_paid_at IS NOT NULL) AS conversion_count,
        (SELECT coalesce(sum(commission_dzd), 0)::int FROM affiliate_commissions c
          WHERE c.affiliate_id = p.id AND c.status = 'pending') AS pending_commission_dzd
      FROM profiles p
      WHERE p.role = 'affiliate'
    ) x
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_affiliate_dashboard()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_affiliate_id UUID := auth.uid();
BEGIN
  IF NOT is_affiliate() AND NOT is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF is_super_admin() THEN
    RETURN jsonb_build_object('error', 'use_list_affiliates');
  END IF;

  RETURN jsonb_build_object(
    'affiliateCode', (SELECT affiliate_code FROM profiles WHERE id = v_affiliate_id),
    'socialHandle', (SELECT social_handle FROM profiles WHERE id = v_affiliate_id),
    'signupCount', (SELECT count(*)::int FROM tenants WHERE referred_affiliate_id = v_affiliate_id),
    'conversionCount', (SELECT count(*)::int FROM tenants WHERE referred_affiliate_id = v_affiliate_id AND affiliate_first_paid_at IS NOT NULL),
    'pendingCommissionDzd', (SELECT coalesce(sum(commission_dzd), 0)::int FROM affiliate_commissions WHERE affiliate_id = v_affiliate_id AND status = 'pending'),
    'approvedCommissionDzd', (SELECT coalesce(sum(commission_dzd), 0)::int FROM affiliate_commissions WHERE affiliate_id = v_affiliate_id AND status = 'approved'),
    'paidCommissionDzd', (SELECT coalesce(sum(commission_dzd), 0)::int FROM affiliate_commissions WHERE affiliate_id = v_affiliate_id AND status = 'paid'),
    'referrals', (
      SELECT coalesce(jsonb_agg(row_to_json(r) ORDER BY r.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT
          t.id AS tenant_id,
          t.name AS business_name,
          t.slug,
          t.plan_id,
          t.subscription_status,
          t.affiliate_code_used,
          t.affiliate_first_paid_at,
          t.affiliate_benefit_ends_at,
          t.affiliate_commission_payments_count,
          t.created_at,
          CASE
            WHEN t.affiliate_benefit_ends_at IS NOT NULL
              THEN greatest(0, ceil(extract(epoch FROM t.affiliate_benefit_ends_at - now()) / 86400.0))::int
            ELSE NULL
          END AS benefit_days_left
        FROM tenants t
        WHERE t.referred_affiliate_id = v_affiliate_id
      ) r
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_affiliate_commissions()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_affiliate() AND NOT is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN (
    SELECT coalesce(jsonb_agg(row_to_json(x) ORDER BY x.created_at DESC), '[]'::jsonb)
    FROM (
      SELECT
        c.*,
        t.name AS business_name,
        t.slug,
        p.full_name AS affiliate_name
      FROM affiliate_commissions c
      JOIN tenants t ON t.id = c.tenant_id
      JOIN profiles p ON p.id = c.affiliate_id
      WHERE is_super_admin() OR c.affiliate_id = auth.uid()
    ) x
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_affiliate_commission_status(
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

  UPDATE affiliate_commissions SET status = p_status, updated_at = now() WHERE id = p_commission_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_affiliate() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_affiliate_by_code(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_affiliate_price_for_plan(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_affiliate_commission_rate_for_plan(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_affiliate_pricing_eligible(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_tenant_affiliate_pricing(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_tenant_affiliate_benefit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_affiliate_commission_for_subscription(UUID, UUID, TEXT, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_affiliates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_affiliate_dashboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_affiliate_commissions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_affiliate_commission_status(UUID, TEXT) TO authenticated;
