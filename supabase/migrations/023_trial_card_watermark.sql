-- Trial tenants: expose watermark flag on public card + tenant lookups

CREATE OR REPLACE FUNCTION public.get_tenant_by_slug(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant tenants%ROWTYPE;
  v_settings shop_settings%ROWTYPE;
  v_access_allowed BOOLEAN;
BEGIN
  SELECT * INTO v_tenant FROM tenants WHERE slug = lower(trim(p_slug));
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_settings FROM shop_settings WHERE tenant_id = v_tenant.id;

  SELECT is_access_allowed INTO v_access_allowed
  FROM get_tenant_plan(v_tenant.id);

  RETURN jsonb_build_object(
    'id', v_tenant.id,
    'slug', v_tenant.slug,
    'name', v_tenant.name,
    'logoUrl', v_tenant.logo_url,
    'brandColor', v_tenant.brand_color,
    'businessName', COALESCE(v_settings.business_name, v_tenant.name),
    'primaryColor', COALESCE(v_settings.primary_color, v_tenant.brand_color),
    'secondaryColor', COALESCE(v_settings.secondary_color, '#0E9F6E'),
    'clientLanguage', COALESCE(v_settings.client_language, 'fr'),
    'isAccessAllowed', COALESCE(v_access_allowed, false),
    'planId', v_tenant.plan_id,
    'subscriptionStatus', v_tenant.subscription_status,
    'showCartaWatermark', (v_tenant.plan_id = 'trial')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_client_card_by_token(p_token TEXT, p_tenant_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client clients%ROWTYPE;
  v_tenant tenants%ROWTYPE;
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

  SELECT * INTO v_tenant FROM tenants WHERE id = v_client.tenant_id;
  SELECT * INTO v_settings FROM shop_settings WHERE tenant_id = v_client.tenant_id;

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
        'stampsAdded', sl.stamps_added,
        'spendAddedDzd', sl.spend_added_dzd
      )
      ORDER BY sl.scanned_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_recent_scans
  FROM (
    SELECT scanned_at, status, stamps_added, spend_added_dzd
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
    'stampsEnabled', COALESCE(v_settings.stamps_enabled, true),
    'spendEnabled', COALESCE(v_settings.spend_enabled, false),
    'currency', COALESCE(v_settings.currency, 'DZD'),
    'stampThreshold', COALESCE(v_settings.stamp_threshold, 9),
    'currentCycleStamps', v_client.current_cycle_stamps,
    'spendThresholdDzd', COALESCE(v_settings.spend_threshold_dzd, 10000),
    'currentCycleSpendDzd', COALESCE(v_client.current_cycle_spend_dzd, 0),
    'rewardValue', v_settings.reward_value,
    'cardCode', v_client.card_code,
    'stampMilestones', COALESCE(v_settings.stamp_milestones, '[]'::jsonb),
    'pendingRewardId', v_pending_reward.id,
    'pendingRewardDescription', v_pending_reward.reward_description,
    'rewards', COALESCE(v_rewards, '[]'::jsonb),
    'recentScans', COALESCE(v_recent_scans, '[]'::jsonb),
    'showCartaWatermark', (v_tenant.plan_id = 'trial')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_card_by_token(TEXT, UUID) TO anon, authenticated;
