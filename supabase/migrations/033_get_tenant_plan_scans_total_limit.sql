-- Migration 021 added plans.scans_total_limit and check_plan_limits() uses it,
-- but get_tenant_plan() was not updated — causes:
--   record "v_plan" has no field "scans_total_limit"

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS scans_total_limit INT;

DROP FUNCTION IF EXISTS public.get_tenant_plan(UUID);

CREATE FUNCTION public.get_tenant_plan(p_tenant_id UUID)
RETURNS TABLE (
  plan_id TEXT,
  client_limit INT,
  worker_limit INT,
  campaign_limit INT,
  scans_per_day_limit INT,
  scans_total_limit INT,
  features_json JSONB,
  subscription_status TEXT,
  trial_ends_at TIMESTAMPTZ,
  is_access_allowed BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant tenants%ROWTYPE;
  v_plan plans%ROWTYPE;
  v_allowed BOOLEAN;
BEGIN
  SELECT * INTO v_tenant FROM tenants WHERE id = p_tenant_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT * INTO v_plan FROM plans WHERE id = v_tenant.plan_id;

  v_allowed := v_tenant.subscription_status IN ('trialing', 'active');
  IF v_tenant.subscription_status = 'trialing' AND v_tenant.trial_ends_at IS NOT NULL THEN
    v_allowed := v_allowed AND v_tenant.trial_ends_at > now();
  END IF;
  IF v_tenant.subscription_status = 'active' AND v_tenant.subscription_ends_at IS NOT NULL THEN
    v_allowed := v_allowed AND v_tenant.subscription_ends_at > now();
  END IF;

  plan_id := v_tenant.plan_id;
  client_limit := v_plan.client_limit;
  worker_limit := v_plan.worker_limit;
  campaign_limit := v_plan.campaign_limit;
  scans_per_day_limit := v_plan.scans_per_day_limit;
  scans_total_limit := v_plan.scans_total_limit;
  features_json := v_plan.features_json;
  subscription_status := v_tenant.subscription_status;
  trial_ends_at := v_tenant.trial_ends_at;
  is_access_allowed := v_allowed;
  RETURN NEXT;
END;
$$;
