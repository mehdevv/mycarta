-- Short 6-digit public card codes for URLs and QR (internal UUID kept for legacy)

CREATE SEQUENCE IF NOT EXISTS client_card_code_seq START WITH 1000;

CREATE OR REPLACE FUNCTION public.encode_card_code(p_seq BIGINT)
RETURNS CHAR(6)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lpad((((p_seq * 48271::bigint + 73856093) % 1000000)::bigint)::text, 6, '0');
$$;

CREATE OR REPLACE FUNCTION public.generate_unique_card_code()
RETURNS CHAR(6)
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  v_seq BIGINT;
  v_code CHAR(6);
  v_guard INT := 0;
BEGIN
  LOOP
    v_seq := nextval('client_card_code_seq');
    v_code := public.encode_card_code(v_seq);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.clients WHERE card_code = v_code);
    v_guard := v_guard + 1;
    IF v_guard > 200 THEN
      RAISE EXCEPTION 'Unable to allocate unique card code';
    END IF;
  END LOOP;
  RETURN v_code;
END;
$$;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS card_code CHAR(6);

DO $$
DECLARE
  r RECORD;
  v_seq BIGINT := 1000;
  v_code CHAR(6);
BEGIN
  FOR r IN
    SELECT id FROM public.clients WHERE card_code IS NULL ORDER BY enrolled_at
  LOOP
    LOOP
      v_code := public.encode_card_code(v_seq);
      v_seq := v_seq + 1;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.clients WHERE card_code = v_code);
    END LOOP;
    UPDATE public.clients SET card_code = v_code WHERE id = r.id;
  END LOOP;
  PERFORM setval('client_card_code_seq', GREATEST(v_seq, 1000));
END $$;

ALTER TABLE public.clients
  ALTER COLUMN card_code SET NOT NULL,
  ALTER COLUMN card_code SET DEFAULT public.generate_unique_card_code();

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_card_code ON public.clients(card_code);

-- Replace UUID-token RPCs with text codes (still accepts legacy UUID strings)
DROP FUNCTION IF EXISTS public.get_client_card_by_token(UUID);
DROP FUNCTION IF EXISTS public.get_reward_claim_by_token(UUID);

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
    'cardCode', v_client.card_code,
    'stampMilestones', COALESCE(v_settings.stamp_milestones, '[]'::jsonb),
    'pendingRewardId', v_pending_reward.id,
    'pendingRewardDescription', v_pending_reward.reward_description,
    'recentScans', v_recent_scans
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_reward_claim_by_token(p_token TEXT)
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
    'cardCode', v_client.card_code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_card_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_reward_claim_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_unique_card_code() TO service_role;
