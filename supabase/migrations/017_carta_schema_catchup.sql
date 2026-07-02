-- Carta SaaS — idempotent catch-up migration (012 → 016)
-- =============================================================================
-- For EXISTING databases only (already ran 001–011).
--
-- GREENFIELD / empty project? Use instead:
--   supabase/mycarta_full_schema.sql
--
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Project: qealyijgeosyvmfpojzq (mycarta production)
--
-- Safe to re-run on databases that already have some of these changes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 012 / 013 — Card design preset + tenant-scoped client card RPC
-- -----------------------------------------------------------------------------
ALTER TABLE shop_settings
  ADD COLUMN IF NOT EXISTS card_design_id TEXT NOT NULL DEFAULT 'classic';

COMMENT ON COLUMN shop_settings.card_design_id IS
  'Preset id from app card templates (stamp style + card layout).';

DROP FUNCTION IF EXISTS public.get_client_card_by_token(TEXT);

CREATE OR REPLACE FUNCTION public.get_client_card_by_token(p_token TEXT, p_tenant_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client clients%ROWTYPE;
  v_settings shop_settings%ROWTYPE;
  v_pending_reward rewards%ROWTYPE;
  v_recent_scans JSONB;
  v_rewards JSONB;
  v_lookup TEXT;
BEGIN
  v_lookup := lpad(trim(p_token), 6, '0');

  IF p_tenant_id IS NOT NULL THEN
    SELECT * INTO v_client
    FROM clients
    WHERE tenant_id = p_tenant_id
      AND (card_code = v_lookup OR fidelity_qr_token::text = trim(p_token))
      AND NOT is_blocked
    LIMIT 1;
  ELSE
    SELECT * INTO v_client
    FROM clients
    WHERE (card_code = v_lookup OR fidelity_qr_token::text = trim(p_token))
      AND NOT is_blocked
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_settings
  FROM shop_settings
  WHERE tenant_id = v_client.tenant_id;

  SELECT * INTO v_pending_reward
  FROM rewards
  WHERE client_id = v_client.id
    AND redeemed_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'scannedAt', sl.scanned_at,
        'status', sl.status,
        'stampsAdded', sl.stamps_added
      )
      ORDER BY sl.scanned_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_recent_scans
  FROM (
    SELECT scanned_at, status, stamps_added
    FROM scan_logs
    WHERE client_id = v_client.id
      AND scanned_at > (NOW() - INTERVAL '1 hour')
    ORDER BY scanned_at DESC
    LIMIT 5
  ) sl;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'rewardDescription', r.reward_description,
        'createdAt', r.created_at,
        'redeemedAt', r.redeemed_at
      )
      ORDER BY r.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_rewards
  FROM rewards r
  WHERE r.client_id = v_client.id;

  RETURN jsonb_build_object(
    'businessName', COALESCE(v_settings.business_name, 'mycarta'),
    'clientName', v_client.full_name,
    'primaryColor', COALESCE(v_settings.primary_color, '#1A56DB'),
    'secondaryColor', COALESCE(v_settings.secondary_color, '#0E9F6E'),
    'cardUrl', v_client.card_url,
    'cardTemplateUrl', v_settings.card_template_url,
    'cardDesignId', COALESCE(v_settings.card_design_id, 'classic'),
    'stampThreshold', COALESCE(v_settings.stamp_threshold, 9),
    'currentCycleStamps', v_client.current_cycle_stamps,
    'cardCode', v_client.card_code,
    'stampMilestones', COALESCE(v_settings.stamp_milestones, '[]'::jsonb),
    'pendingRewardId', v_pending_reward.id,
    'pendingRewardDescription', v_pending_reward.reward_description,
    'rewards', COALESCE(v_rewards, '[]'::jsonb),
    'recentScans', COALESCE(v_recent_scans, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_card_by_token(TEXT, UUID) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 014 — Official pricing grid (June 2026, DZD)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 015 — Tenant activity feed (owner settings)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_name TEXT,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_activity_logs_tenant ON tenant_activity_logs(tenant_id, created_at DESC);

ALTER TABLE tenant_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_activity_logs_select ON tenant_activity_logs;
CREATE POLICY tenant_activity_logs_select ON tenant_activity_logs FOR SELECT USING (
  is_super_admin() OR (is_tenant_owner() AND tenant_id = get_my_tenant_id())
);

DROP POLICY IF EXISTS tenant_activity_logs_insert ON tenant_activity_logs;
CREATE POLICY tenant_activity_logs_insert ON tenant_activity_logs FOR INSERT WITH CHECK (
  is_super_admin() OR (is_tenant_owner() AND tenant_id = get_my_tenant_id())
);

CREATE OR REPLACE FUNCTION public.log_tenant_activity(
  p_kind TEXT,
  p_title TEXT,
  p_detail TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_actor_name TEXT;
  v_id UUID;
BEGIN
  v_tenant_id := get_my_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_not_found';
  END IF;
  IF NOT (is_tenant_owner() OR is_super_admin()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT full_name INTO v_actor_name FROM profiles WHERE id = auth.uid();

  INSERT INTO tenant_activity_logs (tenant_id, actor_id, actor_name, kind, title, detail, metadata)
  VALUES (
    v_tenant_id,
    auth.uid(),
    v_actor_name,
    p_kind,
    p_title,
    p_detail,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_tenant_activity(TEXT, TEXT, TEXT, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_tenant_activities(
  p_limit INT DEFAULT 30,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_limit INT;
  v_offset INT;
  v_rows JSONB;
BEGIN
  v_tenant_id := get_my_tenant_id();
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('activities', '[]'::jsonb, 'hasMore', false);
  END IF;
  IF NOT (is_tenant_owner() OR is_super_admin()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 30), 100));
  v_offset := GREATEST(0, COALESCE(p_offset, 0));

  WITH feed AS (
    SELECT
      'scan:' || s.id::text AS id,
      CASE
        WHEN s.scan_type = 'enrolment' THEN 'client.enrolled'
        WHEN s.status = 'blocked_fraud' THEN 'scan.fraud'
        WHEN s.status = 'blocked_limit' THEN 'scan.limit'
        ELSE 'scan.approved'
      END AS kind,
      COALESCE(c.full_name, '') AS detail,
      COALESCE(p.full_name, '') AS actor_name,
      jsonb_build_object(
        'clientName', c.full_name,
        'workerName', p.full_name,
        'stampsAdded', s.stamps_added,
        'status', s.status,
        'scanType', s.scan_type,
        'rewardTriggered', s.reward_triggered
      ) AS metadata,
      s.scanned_at AS occurred_at
    FROM scan_logs s
    LEFT JOIN clients c ON c.id = s.client_id
    LEFT JOIN profiles p ON p.id = s.worker_id
    WHERE s.tenant_id = v_tenant_id

    UNION ALL

    SELECT
      'reward:earned:' || r.id::text,
      'reward.earned',
      COALESCE(c.full_name, ''),
      COALESCE(p.full_name, ''),
      jsonb_build_object(
        'clientName', c.full_name,
        'workerName', p.full_name,
        'rewardDescription', r.reward_description
      ),
      r.created_at
    FROM rewards r
    JOIN clients c ON c.id = r.client_id
    LEFT JOIN scan_logs s ON s.id = r.scan_log_id
    LEFT JOIN profiles p ON p.id = s.worker_id
    WHERE r.tenant_id = v_tenant_id

    UNION ALL

    SELECT
      'reward:redeemed:' || r.id::text,
      'reward.redeemed',
      COALESCE(c.full_name, ''),
      COALESCE(p.full_name, ''),
      jsonb_build_object(
        'clientName', c.full_name,
        'workerName', p.full_name,
        'rewardDescription', r.reward_description
      ),
      r.redeemed_at
    FROM rewards r
    JOIN clients c ON c.id = r.client_id
    LEFT JOIN profiles p ON p.id = r.redeemed_by_worker_id
    WHERE r.tenant_id = v_tenant_id AND r.redeemed_at IS NOT NULL

    UNION ALL

    SELECT
      'worker:' || p.id::text,
      'worker.added',
      p.full_name,
      '',
      jsonb_build_object('workerName', p.full_name, 'email', p.email),
      p.created_at
    FROM profiles p
    WHERE p.tenant_id = v_tenant_id AND p.role = 'worker'

    UNION ALL

    SELECT
      'product:' || pr.id::text,
      'product.added',
      pr.name,
      '',
      jsonb_build_object('productName', pr.name, 'price', pr.price),
      pr.created_at
    FROM products pr
    WHERE pr.tenant_id = v_tenant_id

    UNION ALL

    SELECT
      'payment:' || rc.id::text,
      'payment.submitted',
      rc.amount_dzd::text || ' DZD',
      '',
      jsonb_build_object('amountDzd', rc.amount_dzd, 'status', rc.status, 'planId', rc.plan_id),
      rc.created_at
    FROM payment_receipts rc
    WHERE rc.tenant_id = v_tenant_id

    UNION ALL

    SELECT
      'subscription:' || sub.id::text,
      'subscription.created',
      sub.plan_id,
      '',
      jsonb_build_object('planId', sub.plan_id, 'status', sub.status, 'amountDzd', sub.amount_dzd),
      sub.created_at
    FROM subscriptions sub
    WHERE sub.tenant_id = v_tenant_id

    UNION ALL

    SELECT
      'log:' || l.id::text,
      l.kind,
      COALESCE(l.detail, ''),
      COALESCE(l.actor_name, ''),
      l.metadata,
      l.created_at
    FROM tenant_activity_logs l
    WHERE l.tenant_id = v_tenant_id
  ),
  page AS (
    SELECT *
    FROM feed
    ORDER BY occurred_at DESC
    LIMIT v_limit + 1
    OFFSET v_offset
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'kind', kind,
        'detail', detail,
        'actorName', actor_name,
        'metadata', metadata,
        'occurredAt', occurred_at
      )
      ORDER BY occurred_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_rows
  FROM (SELECT * FROM page LIMIT v_limit) p;

  RETURN jsonb_build_object(
    'activities', v_rows,
    'hasMore', (SELECT count(*) FROM page) > v_limit
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_tenant_activities(INT, INT) TO authenticated;

-- -----------------------------------------------------------------------------
-- 016 — Per-tenant product catalog on insert
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.products_set_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := get_my_tenant_id();
  END IF;

  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id is required';
  END IF;

  IF NOT is_super_admin() AND NEW.tenant_id IS DISTINCT FROM get_my_tenant_id() THEN
    RAISE EXCEPTION 'Cannot create product for another tenant';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_set_tenant ON products;
CREATE TRIGGER products_set_tenant
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION products_set_tenant_id();
