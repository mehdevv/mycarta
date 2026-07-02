-- Free trial caps: 10 clients, 25 approved purchase scans (lifetime during trial)

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS scans_total_limit INT;

UPDATE plans SET
  client_limit = 10,
  scans_total_limit = 25,
  scans_per_day_limit = NULL
WHERE id = 'trial';

CREATE OR REPLACE FUNCTION public.check_plan_limits(p_tenant_id UUID, p_check TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plan RECORD;
  v_count INT;
  v_today_scans INT;
  v_total_scans INT;
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

  IF p_check = 'tenant_scans_today' THEN
    IF v_plan.scans_total_limit IS NOT NULL THEN
      SELECT count(*) INTO v_total_scans
      FROM scan_logs
      WHERE tenant_id = p_tenant_id
        AND status = 'approved'
        AND scan_type = 'purchase';
      IF v_total_scans >= v_plan.scans_total_limit THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'reason', 'tenant_scan_total_limit',
          'limit', v_plan.scans_total_limit,
          'upgrade_required', true
        );
      END IF;
    END IF;

    IF v_plan.scans_per_day_limit IS NOT NULL THEN
      SELECT count(*) INTO v_today_scans
      FROM scan_logs
      WHERE tenant_id = p_tenant_id
        AND status = 'approved'
        AND scan_type = 'purchase'
        AND scanned_at >= date_trunc('day', now());
      IF v_today_scans >= v_plan.scans_per_day_limit THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'reason', 'tenant_scan_limit',
          'limit', v_plan.scans_per_day_limit,
          'upgrade_required', true
        );
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

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
    'scansTotalLimit', v_plan.scans_total_limit,
    'featuresJson', v_plan.features_json
  );
END;
$$;
