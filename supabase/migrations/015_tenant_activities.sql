-- Tenant activity feed for owner settings (aggregates existing data + explicit logs)

CREATE TABLE tenant_activity_logs (
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

CREATE INDEX idx_tenant_activity_logs_tenant ON tenant_activity_logs(tenant_id, created_at DESC);

ALTER TABLE tenant_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_activity_logs_select ON tenant_activity_logs FOR SELECT USING (
  is_super_admin() OR (is_tenant_owner() AND tenant_id = get_my_tenant_id())
);

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
