-- LoyalQR official pricing grid — June 2026 (DZD)

ALTER TABLE plans ADD COLUMN IF NOT EXISTS location_limit INT;

UPDATE plans SET
  name = 'Essai gratuit',
  price_monthly_dzd = 0,
  price_annual_dzd = 0,
  client_limit = 250,
  worker_limit = 3,
  campaign_limit = 3,
  location_limit = 1,
  scans_per_day_limit = NULL,
  trial_days = 14,
  features_json = '{
    "whatsapp": false,
    "api_access": false,
    "card_design": "standard",
    "ai_card_builder": false,
    "card_templates": false,
    "exclusive_templates": false,
    "custom_card_bg": false,
    "campaigns": true
  }'::jsonb,
  sort_order = 0
WHERE id = 'trial';

UPDATE plans SET
  name = 'Boutique',
  price_monthly_dzd = 2900,
  price_annual_dzd = 29000,
  client_limit = 250,
  worker_limit = 3,
  campaign_limit = 3,
  location_limit = 1,
  scans_per_day_limit = NULL,
  trial_days = 14,
  features_json = '{
    "whatsapp": false,
    "api_access": false,
    "card_design": "standard",
    "ai_card_builder": false,
    "card_templates": false,
    "exclusive_templates": false,
    "custom_card_bg": false,
    "campaigns": true
  }'::jsonb,
  sort_order = 1
WHERE id = 'boutique';

UPDATE plans SET
  name = 'Maison',
  price_monthly_dzd = 5400,
  price_annual_dzd = 54000,
  client_limit = 2000,
  worker_limit = 15,
  campaign_limit = NULL,
  location_limit = 3,
  scans_per_day_limit = NULL,
  trial_days = 14,
  features_json = '{
    "whatsapp": true,
    "api_access": false,
    "card_design": "ai_builder",
    "ai_card_builder": true,
    "card_templates": true,
    "exclusive_templates": false,
    "custom_card_bg": true,
    "campaigns": true
  }'::jsonb,
  sort_order = 2
WHERE id = 'maison';

UPDATE plans SET
  name = 'Prestige',
  price_monthly_dzd = NULL,
  price_annual_dzd = NULL,
  client_limit = NULL,
  worker_limit = NULL,
  campaign_limit = NULL,
  location_limit = NULL,
  scans_per_day_limit = NULL,
  trial_days = 0,
  features_json = '{
    "whatsapp": true,
    "api_access": true,
    "card_design": "ai_premium",
    "ai_card_builder": true,
    "card_templates": true,
    "exclusive_templates": true,
    "custom_card_bg": true,
    "campaigns": true
  }'::jsonb,
  sort_order = 3
WHERE id = 'prestige';

-- Extend plan limit checks (campaigns when table exists).
CREATE OR REPLACE FUNCTION public.check_plan_limits(p_tenant_id UUID, p_check TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plan RECORD;
  v_count INT;
  v_today_scans INT;
  v_campaigns_this_month INT;
BEGIN
  SELECT * INTO v_plan FROM get_tenant_plan(p_tenant_id);
  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'tenant_not_found');
  END IF;

  IF NOT v_plan.is_access_allowed THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'subscription_expired', 'upgrade_required', true);
  END IF;

  IF p_check = 'enrol_client' AND v_plan.client_limit IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM clients WHERE tenant_id = p_tenant_id;
    IF v_count >= v_plan.client_limit THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'client_limit', 'limit', v_plan.client_limit, 'upgrade_required', true);
    END IF;
  END IF;

  IF p_check = 'add_worker' AND v_plan.worker_limit IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM profiles WHERE tenant_id = p_tenant_id AND role = 'worker' AND is_active = true;
    IF v_count >= v_plan.worker_limit THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'worker_limit', 'limit', v_plan.worker_limit, 'upgrade_required', true);
    END IF;
  END IF;

  IF p_check = 'add_campaign' AND v_plan.campaign_limit IS NOT NULL THEN
    IF to_regclass('public.campaigns') IS NOT NULL THEN
      SELECT count(*) INTO v_campaigns_this_month
      FROM campaigns
      WHERE tenant_id = p_tenant_id
        AND created_at >= date_trunc('month', now());
      IF v_campaigns_this_month >= v_plan.campaign_limit THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'campaign_limit', 'limit', v_plan.campaign_limit, 'upgrade_required', true);
      END IF;
    END IF;
  END IF;

  IF p_check = 'tenant_scans_today' AND v_plan.scans_per_day_limit IS NOT NULL THEN
    SELECT count(*) INTO v_today_scans FROM scan_logs
    WHERE tenant_id = p_tenant_id AND status = 'approved' AND stamps_added > 0
      AND scanned_at >= date_trunc('day', now());
    IF v_today_scans >= v_plan.scans_per_day_limit THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'tenant_scan_limit', 'limit', v_plan.scans_per_day_limit, 'upgrade_required', true);
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Return plan limits in trial status for dashboard UI.
CREATE OR REPLACE FUNCTION public.get_trial_status(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant tenants%ROWTYPE;
  v_plan plans%ROWTYPE;
  v_days_left INT;
BEGIN
  SELECT * INTO v_tenant FROM tenants WHERE id = p_tenant_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO v_plan FROM plans WHERE id = v_tenant.plan_id;

  v_days_left := CASE
    WHEN v_tenant.trial_ends_at IS NOT NULL THEN GREATEST(0, EXTRACT(day FROM v_tenant.trial_ends_at - now())::int)
    ELSE 0
  END;

  RETURN jsonb_build_object(
    'planId', v_tenant.plan_id,
    'planName', v_plan.name,
    'subscriptionStatus', v_tenant.subscription_status,
    'trialEndsAt', v_tenant.trial_ends_at,
    'subscriptionEndsAt', v_tenant.subscription_ends_at,
    'daysLeft', v_days_left,
    'isActive', (SELECT is_access_allowed FROM get_tenant_plan(p_tenant_id)),
    'clientLimit', v_plan.client_limit,
    'workerLimit', v_plan.worker_limit,
    'campaignLimit', v_plan.campaign_limit,
    'locationLimit', v_plan.location_limit,
    'scansPerDayLimit', v_plan.scans_per_day_limit,
    'featuresJson', v_plan.features_json
  );
END;
$$;
