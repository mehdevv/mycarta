-- Pending worker-input scans must not count as completed until confirm-purchase-scan.

ALTER TABLE scan_logs DROP CONSTRAINT IF EXISTS scan_logs_status_check;
ALTER TABLE scan_logs
  ADD CONSTRAINT scan_logs_status_check
  CHECK (status IN ('pending', 'approved', 'blocked_fraud', 'blocked_limit'));

-- Old rows stuck as approved while still waiting on worker input
UPDATE scan_logs
SET status = 'pending'
WHERE status = 'approved'
  AND scan_type = 'purchase'
  AND stamps_added = 0
  AND spend_added_dzd = 0
  AND purchase_amount_dzd IS NULL
  AND (pending_products OR pending_amount OR pending_stamps);

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
        AND scan_type = 'purchase'
        AND (stamps_added > 0 OR spend_added_dzd > 0 OR purchase_amount_dzd > 0);
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
        AND (stamps_added > 0 OR spend_added_dzd > 0 OR purchase_amount_dzd > 0)
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
