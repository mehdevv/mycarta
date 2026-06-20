-- Platform admin RPCs (run after 001_saas_complete.sql)
-- Powers the SaaS owner console at /platform

CREATE OR REPLACE FUNCTION public.get_platform_overview()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_signups JSONB;
  v_scans JSONB;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'date', to_char(d, 'YYYY-MM-DD'),
    'count', c
  ) ORDER BY d), '[]'::jsonb)
  INTO v_signups
  FROM (
    SELECT date_trunc('day', created_at) AS d, count(*)::int AS c
    FROM tenants
    WHERE created_at >= now() - interval '30 days'
    GROUP BY 1
  ) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'date', to_char(d, 'YYYY-MM-DD'),
    'count', c
  ) ORDER BY d), '[]'::jsonb)
  INTO v_scans
  FROM (
    SELECT date_trunc('day', scanned_at) AS d, count(*)::int AS c
    FROM scan_logs
    WHERE scanned_at >= now() - interval '30 days'
    GROUP BY 1
  ) s;

  RETURN jsonb_build_object(
    'totalTenants', (SELECT count(*)::int FROM tenants),
    'trialingTenants', (SELECT count(*)::int FROM tenants WHERE subscription_status = 'trialing'),
    'activeTenants', (SELECT count(*)::int FROM tenants WHERE subscription_status = 'active'),
    'expiredTenants', (SELECT count(*)::int FROM tenants WHERE subscription_status IN ('expired', 'past_due', 'canceled')),
    'totalClients', (SELECT count(*)::int FROM clients),
    'totalScans', (SELECT count(*)::int FROM scan_logs),
    'scansToday', (SELECT count(*)::int FROM scan_logs WHERE scanned_at >= date_trunc('day', now())),
    'scansThisWeek', (SELECT count(*)::int FROM scan_logs WHERE scanned_at >= date_trunc('week', now())),
    'totalRewards', (SELECT count(*)::int FROM rewards),
    'pendingReceipts', (SELECT count(*)::int FROM payment_receipts WHERE status = 'pending'),
    'activeSubscriptions', (SELECT count(*)::int FROM subscriptions WHERE status = 'active'),
    'estimatedMrrDzd', (
      SELECT COALESCE(sum(p.price_monthly_dzd), 0)::int
      FROM tenants t
      JOIN plans p ON p.id = t.plan_id
      WHERE t.subscription_status = 'active' AND p.price_monthly_dzd IS NOT NULL
    ),
    'tenantsByPlan', (
      SELECT COALESCE(jsonb_object_agg(plan_id, cnt), '{}'::jsonb)
      FROM (SELECT plan_id, count(*)::int AS cnt FROM tenants GROUP BY plan_id) x
    ),
    'signupsByDay', v_signups,
    'scansByDay', v_scans
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_platform_tenants()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.created_at DESC), '[]'::jsonb)
    FROM (
      SELECT
        t.id,
        t.slug,
        t.name,
        t.plan_id AS "planId",
        p.name AS "planName",
        t.subscription_status AS "subscriptionStatus",
        t.trial_ends_at AS "trialEndsAt",
        t.subscription_ends_at AS "subscriptionEndsAt",
        t.onboarding_complete AS "onboardingComplete",
        t.created_at AS "createdAt",
        (SELECT count(*)::int FROM clients c WHERE c.tenant_id = t.id) AS "clientCount",
        (SELECT count(*)::int FROM scan_logs s WHERE s.tenant_id = t.id) AS "scanCount",
        (SELECT count(*)::int FROM profiles pr WHERE pr.tenant_id = t.id AND pr.role = 'worker') AS "workerCount",
        (SELECT pr.email FROM profiles pr WHERE pr.tenant_id = t.id AND pr.role = 'owner' LIMIT 1) AS "ownerEmail",
        (SELECT pr.full_name FROM profiles pr WHERE pr.tenant_id = t.id AND pr.role = 'owner' LIMIT 1) AS "ownerName"
      FROM tenants t
      LEFT JOIN plans p ON p.id = t.plan_id
    ) x
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_platform_tenant_detail(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant tenants%ROWTYPE;
  v_plan plans%ROWTYPE;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO v_tenant FROM tenants WHERE id = p_tenant_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_plan FROM plans WHERE id = v_tenant.plan_id;

  RETURN jsonb_build_object(
    'id', v_tenant.id,
    'slug', v_tenant.slug,
    'name', v_tenant.name,
    'planId', v_tenant.plan_id,
    'planName', v_plan.name,
    'subscriptionStatus', v_tenant.subscription_status,
    'trialEndsAt', v_tenant.trial_ends_at,
    'subscriptionEndsAt', v_tenant.subscription_ends_at,
    'onboardingComplete', v_tenant.onboarding_complete,
    'createdAt', v_tenant.created_at,
    'clientCount', (SELECT count(*)::int FROM clients WHERE tenant_id = p_tenant_id),
    'scanCount', (SELECT count(*)::int FROM scan_logs WHERE tenant_id = p_tenant_id),
    'workerCount', (SELECT count(*)::int FROM profiles WHERE tenant_id = p_tenant_id AND role = 'worker'),
    'rewardCount', (SELECT count(*)::int FROM rewards WHERE tenant_id = p_tenant_id),
    'productCount', (SELECT count(*)::int FROM products WHERE tenant_id = p_tenant_id),
    'scansToday', (SELECT count(*)::int FROM scan_logs WHERE tenant_id = p_tenant_id AND scanned_at >= date_trunc('day', now())),
    'owner', (
      SELECT jsonb_build_object('id', pr.id, 'fullName', pr.full_name, 'email', pr.email)
      FROM profiles pr WHERE pr.tenant_id = p_tenant_id AND pr.role = 'owner' LIMIT 1
    ),
    'recentScans', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', s.id,
        'clientName', c.full_name,
        'status', s.status,
        'stampsAdded', s.stamps_added,
        'scannedAt', s.scanned_at
      ) ORDER BY s.scanned_at DESC), '[]'::jsonb)
      FROM scan_logs s
      LEFT JOIN clients c ON c.id = s.client_id
      WHERE s.tenant_id = p_tenant_id
      LIMIT 10
    ),
    'subscriptions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', sub.id,
        'planId', sub.plan_id,
        'billingPeriod', sub.billing_period,
        'status', sub.status,
        'amountDzd', sub.amount_dzd,
        'startsAt', sub.starts_at,
        'endsAt', sub.ends_at,
        'createdAt', sub.created_at
      ) ORDER BY sub.created_at DESC), '[]'::jsonb)
      FROM subscriptions sub WHERE sub.tenant_id = p_tenant_id
    ),
    'receipts', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', r.id,
        'planId', r.plan_id,
        'amountDzd', r.amount_dzd,
        'status', r.status,
        'createdAt', r.created_at
      ) ORDER BY r.created_at DESC), '[]'::jsonb)
      FROM payment_receipts r WHERE r.tenant_id = p_tenant_id
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_tenants() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_tenant_detail(UUID) TO authenticated;
