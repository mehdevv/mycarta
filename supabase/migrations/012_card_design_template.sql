-- Card design templates: store owner's chosen layout/stamp style preset.

ALTER TABLE shop_settings
  ADD COLUMN IF NOT EXISTS card_design_id TEXT NOT NULL DEFAULT 'classic';

COMMENT ON COLUMN shop_settings.card_design_id IS
  'Preset id from app card templates (stamp style + card layout).';

-- Extend client card RPC with cardDesignId (based on 010_client_rewards_history.sql).
CREATE OR REPLACE FUNCTION public.get_client_card_by_token(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client clients%ROWTYPE;
  v_settings shop_settings%ROWTYPE;
  v_pending_reward rewards%ROWTYPE;
  v_recent_scans JSON;
  v_rewards JSON;
  v_lookup TEXT;
BEGIN
  v_lookup := trim(p_token);

  SELECT * INTO v_client
  FROM clients
  WHERE (
    card_code = v_lookup
    OR fidelity_qr_token::text = v_lookup
  )
    AND NOT is_blocked;

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
    json_agg(
      json_build_object(
        'scannedAt', sl.scanned_at,
        'status', sl.status,
        'stampsAdded', sl.stamps_added
      )
      ORDER BY sl.scanned_at DESC
    ),
    '[]'::json
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
    json_agg(
      json_build_object(
        'id', r.id,
        'rewardDescription', r.reward_description,
        'createdAt', r.created_at,
        'redeemedAt', r.redeemed_at
      )
      ORDER BY r.created_at DESC
    ),
    '[]'::json
  )
  INTO v_rewards
  FROM rewards r
  WHERE r.client_id = v_client.id;

  RETURN json_build_object(
    'businessName', COALESCE(v_settings.business_name, 'LoyalQR'),
    'clientName', v_client.full_name,
    'primaryColor', COALESCE(v_settings.primary_color, '#1A56DB'),
    'secondaryColor', COALESCE(v_settings.secondary_color, '#0E9F6E'),
    'cardUrl', v_client.card_url,
    'cardTemplateUrl', COALESCE(v_settings.card_template_url, '/card-bg.png'),
    'cardDesignId', COALESCE(v_settings.card_design_id, 'classic'),
    'stampThreshold', COALESCE(v_settings.stamp_threshold, 9),
    'currentCycleStamps', v_client.current_cycle_stamps,
    'cardCode', v_client.card_code,
    'stampMilestones', COALESCE(v_settings.stamp_milestones, '[]'::jsonb),
    'pendingRewardId', v_pending_reward.id,
    'pendingRewardDescription', v_pending_reward.reward_description,
    'rewards', v_rewards,
    'recentScans', v_recent_scans
  );
END;
$$;
