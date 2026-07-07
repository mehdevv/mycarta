-- Reliable scan timing on client card: last successful scan + open pending visit.

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
  v_scans_today INTEGER;
  v_today_start TIMESTAMPTZ;
  v_reset_at TIMESTAMPTZ;
  v_open_pending_at TIMESTAMPTZ;
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

  v_today_start := date_trunc('day', now());
  v_reset_at := v_today_start + interval '1 day';

  SELECT COUNT(*)::INTEGER
  INTO v_scans_today
  FROM scan_logs
  WHERE client_id = v_client.id
    AND status = 'approved'
    AND (
      stamps_added > 0
      OR spend_added_dzd > 0
      OR COALESCE(purchase_amount_dzd, 0) > 0
    )
    AND scanned_at >= v_today_start;

  SELECT scanned_at
  INTO v_open_pending_at
  FROM scan_logs
  WHERE client_id = v_client.id
    AND status = 'pending'
  ORDER BY scanned_at DESC
  LIMIT 1;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'scannedAt', sl.scanned_at,
        'status', sl.status,
        'stampsAdded', sl.stamps_added,
        'spendAddedDzd', sl.spend_added_dzd,
        'blockReason', sl.block_reason
      )
      ORDER BY sl.scanned_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_recent_scans
  FROM (
    SELECT scanned_at, status, stamps_added, spend_added_dzd, block_reason
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
    'clientPhone', v_client.phone,
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
    'socialLinks', COALESCE(v_settings.social_links, '{}'::jsonb),
    'showCartaWatermark', false,
    'maxScansPerDay', COALESCE(v_settings.max_scans_per_day, 2),
    'scansToday', COALESCE(v_scans_today, 0),
    'scansResetAt', v_reset_at,
    'lastScanAt', v_client.last_scan_at,
    'openPendingAt', v_open_pending_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_card_by_token(TEXT, UUID) TO anon, authenticated;
