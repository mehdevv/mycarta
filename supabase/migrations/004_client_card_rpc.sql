-- Public loyalty card + reward claim (anon-safe, token-gated via SECURITY DEFINER)

CREATE OR REPLACE FUNCTION public.get_client_card_by_token(p_token UUID)
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
BEGIN
  SELECT * INTO v_client
  FROM clients
  WHERE fidelity_qr_token = p_token
    AND NOT is_blocked;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_settings FROM shop_settings LIMIT 1;

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
    ORDER BY scanned_at DESC
    LIMIT 5
  ) sl;

  RETURN json_build_object(
    'businessName', COALESCE(v_settings.business_name, 'LoyalQR'),
    'clientName', v_client.full_name,
    'primaryColor', COALESCE(v_settings.primary_color, '#1A56DB'),
    'cardUrl', v_client.card_url,
    'cardTemplateUrl', COALESCE(v_settings.card_template_url, '/card-bg.png'),
    'stampThreshold', COALESCE(v_settings.stamp_threshold, 9),
    'currentCycleStamps', v_client.current_cycle_stamps,
    'fidelityQrToken', v_client.fidelity_qr_token,
    'pendingRewardId', v_pending_reward.id,
    'pendingRewardDescription', v_pending_reward.reward_description,
    'recentScans', v_recent_scans
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_reward_claim_by_token(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client clients%ROWTYPE;
  v_settings shop_settings%ROWTYPE;
  v_reward rewards%ROWTYPE;
BEGIN
  SELECT * INTO v_client
  FROM clients
  WHERE fidelity_qr_token = p_token
    AND NOT is_blocked;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_reward
  FROM rewards
  WHERE client_id = v_client.id
    AND redeemed_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_settings FROM shop_settings LIMIT 1;

  RETURN json_build_object(
    'id', v_reward.id,
    'clientName', v_client.full_name,
    'rewardDescription', v_reward.reward_description,
    'createdAt', v_reward.created_at,
    'redeemedAt', v_reward.redeemed_at,
    'businessName', COALESCE(v_settings.business_name, 'LoyalQR'),
    'primaryColor', COALESCE(v_settings.primary_color, '#1A56DB'),
    'fidelityQrToken', v_client.fidelity_qr_token
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_card_by_token(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_reward_claim_by_token(UUID) TO anon, authenticated;
