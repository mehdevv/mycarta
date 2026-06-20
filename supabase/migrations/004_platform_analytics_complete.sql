-- Platform admin — extended KPIs & analytics (run after 002_platform_admin.sql)
-- Powers richer /platform console: revenue, cards, workers, fraud, cohorts

-- ---------------------------------------------------------------------------
-- Indexes (safe if already exist — use IF NOT EXISTS)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tenants_created_at ON tenants(created_at);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON tenants(subscription_status);
CREATE INDEX IF NOT EXISTS idx_clients_enrolled_at ON clients(tenant_id, enrolled_at);
CREATE INDEX IF NOT EXISTS idx_clients_blocked ON clients(tenant_id, is_blocked);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scanned_at ON scan_logs(tenant_id, scanned_at);
CREATE INDEX IF NOT EXISTS idx_rewards_redeemed ON rewards(tenant_id, redeemed_at);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_created ON payment_receipts(created_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ---------------------------------------------------------------------------
-- Overview — replaces get_platform_overview with extended KPIs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_platform_overview()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_signups JSONB;
  v_scans JSONB;
  v_enrolments JSONB;
  v_revenue_month JSONB;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', to_char(d, 'YYYY-MM-DD'), 'count', c) ORDER BY d), '[]'::jsonb)
  INTO v_signups
  FROM (
    SELECT date_trunc('day', created_at) AS d, count(*)::int AS c
    FROM tenants WHERE created_at >= now() - interval '30 days'
    GROUP BY 1
  ) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', to_char(d, 'YYYY-MM-DD'), 'count', c) ORDER BY d), '[]'::jsonb)
  INTO v_scans
  FROM (
    SELECT date_trunc('day', scanned_at) AS d, count(*)::int AS c
    FROM scan_logs WHERE scanned_at >= now() - interval '30 days' AND status = 'approved'
    GROUP BY 1
  ) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', to_char(d, 'YYYY-MM-DD'), 'count', c) ORDER BY d), '[]'::jsonb)
  INTO v_enrolments
  FROM (
    SELECT date_trunc('day', enrolled_at) AS d, count(*)::int AS c
    FROM clients WHERE enrolled_at >= now() - interval '30 days'
    GROUP BY 1
  ) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', to_char(d, 'YYYY-MM-DD'), 'amountDzd', amt) ORDER BY d), '[]'::jsonb)
  INTO v_revenue_month
  FROM (
    SELECT date_trunc('day', created_at) AS d, sum(amount_dzd)::int AS amt
    FROM payment_receipts
    WHERE status = 'approved' AND created_at >= now() - interval '30 days'
    GROUP BY 1
  ) r;

  RETURN
    jsonb_build_object(
    -- Tenants
    'totalTenants', (SELECT count(*)::int FROM tenants),
    'trialingTenants', (SELECT count(*)::int FROM tenants WHERE subscription_status = 'trialing'),
    'activeTenants', (SELECT count(*)::int FROM tenants WHERE subscription_status = 'active'),
    'pastDueTenants', (SELECT count(*)::int FROM tenants WHERE subscription_status = 'past_due'),
    'canceledTenants', (SELECT count(*)::int FROM tenants WHERE subscription_status = 'canceled'),
    'expiredTenants', (SELECT count(*)::int FROM tenants WHERE subscription_status IN ('expired', 'past_due', 'canceled')),
    'newTenantsToday', (SELECT count(*)::int FROM tenants WHERE created_at >= date_trunc('day', now())),
    'newTenantsThisWeek', (SELECT count(*)::int FROM tenants WHERE created_at >= date_trunc('week', now())),
    'newTenantsThisMonth', (SELECT count(*)::int FROM tenants WHERE created_at >= date_trunc('month', now())),
    'trialExpiring7d', (
      SELECT count(*)::int FROM tenants
      WHERE subscription_status = 'trialing'
        AND trial_ends_at IS NOT NULL
        AND trial_ends_at <= now() + interval '7 days'
        AND trial_ends_at > now()
    ),
    'onboardingCompleteCount', (SELECT count(*)::int FROM tenants WHERE onboarding_complete = true),
    'tutorialCompleteCount', (
      SELECT count(*)::int FROM tenants WHERE dashboard_tutorial_complete = true
    ),

    -- Cards / clients
    'totalClients', (SELECT count(*)::int FROM clients),
    'activeCards', (SELECT count(*)::int FROM clients WHERE is_blocked = false),
    'blockedCards', (SELECT count(*)::int FROM clients WHERE is_blocked = true),
    'clientsEnrolledToday', (SELECT count(*)::int FROM clients WHERE enrolled_at >= date_trunc('day', now())),
    'clientsEnrolledThisWeek', (SELECT count(*)::int FROM clients WHERE enrolled_at >= date_trunc('week', now())),
    'clientsEnrolledThisMonth', (SELECT count(*)::int FROM clients WHERE enrolled_at >= date_trunc('month', now())),

    -- Scans
    'totalScans', (SELECT count(*)::int FROM scan_logs WHERE status = 'approved'),
    'scansToday', (SELECT count(*)::int FROM scan_logs WHERE scanned_at >= date_trunc('day', now()) AND status = 'approved'),
    'scansThisWeek', (SELECT count(*)::int FROM scan_logs WHERE scanned_at >= date_trunc('week', now()) AND status = 'approved'),
    'scansThisMonth', (SELECT count(*)::int FROM scan_logs WHERE scanned_at >= date_trunc('month', now()) AND status = 'approved'),
    'fraudScansTotal', (SELECT count(*)::int FROM scan_logs WHERE status != 'approved'),
    'fraudScansToday', (SELECT count(*)::int FROM scan_logs WHERE scanned_at >= date_trunc('day', now()) AND status != 'approved'),

    -- Rewards
    'totalRewards', (SELECT count(*)::int FROM rewards),
    'rewardsRedeemed', (SELECT count(*)::int FROM rewards WHERE redeemed_at IS NOT NULL),
    'rewardsPending', (SELECT count(*)::int FROM rewards WHERE redeemed_at IS NULL),

    -- People
    'totalWorkers', (SELECT count(*)::int FROM profiles WHERE role = 'worker'),
    'activeWorkers', (SELECT count(*)::int FROM profiles WHERE role = 'worker' AND is_active = true),
    'totalOwners', (SELECT count(*)::int FROM profiles WHERE role = 'owner'),

    -- Catalog & campaigns
    'totalProducts', (SELECT count(*)::int FROM products),
    'activeProducts', (SELECT count(*)::int FROM products WHERE is_active = true),
    'totalCampaigns', (SELECT count(*)::int FROM campaigns),

    -- Billing
    'pendingReceipts', (SELECT count(*)::int FROM payment_receipts WHERE status = 'pending'),
    'approvedReceipts', (SELECT count(*)::int FROM payment_receipts WHERE status = 'approved'),
    'rejectedReceipts', (SELECT count(*)::int FROM payment_receipts WHERE status = 'rejected'),
    'activeSubscriptions', (SELECT count(*)::int FROM subscriptions WHERE status = 'active'),
    'pendingSubscriptions', (SELECT count(*)::int FROM subscriptions WHERE status = 'pending'),
    'estimatedMrrDzd', (
      SELECT COALESCE(sum(p.price_monthly_dzd), 0)::int
      FROM tenants t
      JOIN plans p ON p.id = t.plan_id
      WHERE t.subscription_status = 'active' AND p.price_monthly_dzd IS NOT NULL
    ),
    'estimatedArrDzd', (
      SELECT COALESCE(sum(p.price_monthly_dzd), 0)::int * 12
      FROM tenants t
      JOIN plans p ON p.id = t.plan_id
      WHERE t.subscription_status = 'active' AND p.price_monthly_dzd IS NOT NULL
    ),
    'revenueApprovedTotalDzd', (
      SELECT COALESCE(sum(amount_dzd), 0)::int FROM payment_receipts WHERE status = 'approved'
    ),
    'revenueApprovedThisMonthDzd', (
      SELECT COALESCE(sum(amount_dzd), 0)::int
      FROM payment_receipts
      WHERE status = 'approved' AND created_at >= date_trunc('month', now())
    ),
    'chargilyPaymentsCount', (
      SELECT count(*)::int FROM subscriptions WHERE chargily_payment_id IS NOT NULL AND status = 'active'
    ),
    'baridimobPaymentsCount', (
      SELECT count(*)::int FROM payment_receipts WHERE status = 'approved' AND payment_method IN ('baridimob', 'ccp', 'cib')
    )
    )
    || jsonb_build_object(

    -- Averages
    'avgClientsPerTenant', (
      SELECT CASE WHEN count(*) > 0
        THEN round((SELECT count(*)::numeric FROM clients) / count(*), 1)
        ELSE 0 END
      FROM tenants
    ),
    'avgScansPerTenant', (
      SELECT CASE WHEN count(*) > 0
        THEN round((SELECT count(*)::numeric FROM scan_logs WHERE status = 'approved') / count(*), 1)
        ELSE 0 END
      FROM tenants
    ),
    'avgWorkersPerTenant', (
      SELECT CASE WHEN count(*) > 0
        THEN round((SELECT count(*)::numeric FROM profiles WHERE role = 'worker' AND is_active = true) / count(*), 1)
        ELSE 0 END
      FROM tenants
    ),
    'onboardingRate', (
      SELECT CASE WHEN count(*) > 0
        THEN round(100.0 * count(*) FILTER (WHERE onboarding_complete) / count(*), 1)
        ELSE 0 END
      FROM tenants
    ),
    'trialToPaidRate', (
      SELECT CASE WHEN count(*) > 0
        THEN round(100.0 * count(*) FILTER (WHERE subscription_status = 'active' AND plan_id != 'trial') / count(*), 1)
        ELSE 0 END
      FROM tenants
    ),
    'fraudRate', (
      SELECT CASE WHEN count(*) > 0
        THEN round(100.0 * count(*) FILTER (WHERE status != 'approved') / count(*), 2)
        ELSE 0 END
      FROM scan_logs
    ),

    -- Breakdowns & series
    'tenantsByPlan', (
      SELECT COALESCE(jsonb_object_agg(plan_id, cnt), '{}'::jsonb)
      FROM (SELECT plan_id, count(*)::int AS cnt FROM tenants GROUP BY plan_id) x
    ),
    'tenantsByStatus', (
      SELECT COALESCE(jsonb_object_agg(subscription_status, cnt), '{}'::jsonb)
      FROM (SELECT subscription_status, count(*)::int AS cnt FROM tenants GROUP BY subscription_status) x
    ),
    'mrrByPlan', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'planId', sub.plan_id,
        'planName', p.name,
        'tenantCount', sub.cnt,
        'mrrDzd', sub.mrr
      ) ORDER BY sub.mrr DESC), '[]'::jsonb)
      FROM (
        SELECT t.plan_id, count(*)::int AS cnt, COALESCE(sum(p.price_monthly_dzd), 0)::int AS mrr
        FROM tenants t
        JOIN plans p ON p.id = t.plan_id
        WHERE t.subscription_status = 'active'
        GROUP BY t.plan_id
      ) sub
      JOIN plans p ON p.id = sub.plan_id
    ),
    'signupsByDay', v_signups,
    'scansByDay', v_scans,
    'enrolmentsByDay', v_enrolments,
    'revenueByDay', v_revenue_month
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Tenant list — extended row metrics
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_platform_tenants()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x."createdAt" DESC), '[]'::jsonb)
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
        t.dashboard_tutorial_complete AS "dashboardTutorialComplete",
        t.created_at AS "createdAt",
        (SELECT count(*)::int FROM clients c WHERE c.tenant_id = t.id) AS "clientCount",
        (SELECT count(*)::int FROM clients c WHERE c.tenant_id = t.id AND c.is_blocked = false) AS "activeCardCount",
        (SELECT count(*)::int FROM scan_logs s WHERE s.tenant_id = t.id AND s.status = 'approved') AS "scanCount",
        (SELECT count(*)::int FROM scan_logs s WHERE s.tenant_id = t.id AND s.status != 'approved') AS "fraudScanCount",
        (SELECT count(*)::int FROM profiles pr WHERE pr.tenant_id = t.id AND pr.role = 'worker' AND pr.is_active = true) AS "workerCount",
        (SELECT count(*)::int FROM rewards r WHERE r.tenant_id = t.id) AS "rewardCount",
        (SELECT count(*)::int FROM rewards r WHERE r.tenant_id = t.id AND r.redeemed_at IS NULL) AS "rewardsPending",
        (SELECT count(*)::int FROM products prd WHERE prd.tenant_id = t.id) AS "productCount",
        (SELECT count(*)::int FROM campaigns cam WHERE cam.tenant_id = t.id) AS "campaignCount",
        (SELECT count(*)::int FROM clients c WHERE c.tenant_id = t.id AND c.enrolled_at >= now() - interval '7 days') AS "newClients7d",
        (SELECT max(s.scanned_at) FROM scan_logs s WHERE s.tenant_id = t.id) AS "lastScanAt",
        (SELECT max(c.enrolled_at) FROM clients c WHERE c.tenant_id = t.id) AS "lastEnrolmentAt",
        (SELECT pr.email FROM profiles pr WHERE pr.tenant_id = t.id AND pr.role = 'owner' LIMIT 1) AS "ownerEmail",
        (SELECT pr.full_name FROM profiles pr WHERE pr.tenant_id = t.id AND pr.role = 'owner' LIMIT 1) AS "ownerName",
        p.price_monthly_dzd AS "planMonthlyDzd"
      FROM tenants t
      LEFT JOIN plans p ON p.id = t.plan_id
    ) x
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Tenant detail — extended
-- ---------------------------------------------------------------------------
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
    'planMonthlyDzd', v_plan.price_monthly_dzd,
    'planClientLimit', v_plan.client_limit,
    'planWorkerLimit', v_plan.worker_limit,
    'subscriptionStatus', v_tenant.subscription_status,
    'trialEndsAt', v_tenant.trial_ends_at,
    'subscriptionEndsAt', v_tenant.subscription_ends_at,
    'onboardingComplete', v_tenant.onboarding_complete,
    'dashboardTutorialComplete', v_tenant.dashboard_tutorial_complete,
    'brandColor', v_tenant.brand_color,
    'createdAt', v_tenant.created_at,
    'clientCount', (SELECT count(*)::int FROM clients WHERE tenant_id = p_tenant_id),
    'activeCardCount', (SELECT count(*)::int FROM clients WHERE tenant_id = p_tenant_id AND is_blocked = false),
    'blockedCardCount', (SELECT count(*)::int FROM clients WHERE tenant_id = p_tenant_id AND is_blocked = true),
    'newClients7d', (SELECT count(*)::int FROM clients WHERE tenant_id = p_tenant_id AND enrolled_at >= now() - interval '7 days'),
    'newClients30d', (SELECT count(*)::int FROM clients WHERE tenant_id = p_tenant_id AND enrolled_at >= now() - interval '30 days'),
    'scanCount', (SELECT count(*)::int FROM scan_logs WHERE tenant_id = p_tenant_id AND status = 'approved'),
    'fraudScanCount', (SELECT count(*)::int FROM scan_logs WHERE tenant_id = p_tenant_id AND status != 'approved'),
    'scansToday', (SELECT count(*)::int FROM scan_logs WHERE tenant_id = p_tenant_id AND scanned_at >= date_trunc('day', now()) AND status = 'approved'),
    'scansThisWeek', (SELECT count(*)::int FROM scan_logs WHERE tenant_id = p_tenant_id AND scanned_at >= date_trunc('week', now()) AND status = 'approved'),
    'scansThisMonth', (SELECT count(*)::int FROM scan_logs WHERE tenant_id = p_tenant_id AND scanned_at >= date_trunc('month', now()) AND status = 'approved'),
    'workerCount', (SELECT count(*)::int FROM profiles WHERE tenant_id = p_tenant_id AND role = 'worker' AND is_active = true),
    'inactiveWorkerCount', (SELECT count(*)::int FROM profiles WHERE tenant_id = p_tenant_id AND role = 'worker' AND is_active = false),
    'rewardCount', (SELECT count(*)::int FROM rewards WHERE tenant_id = p_tenant_id),
    'rewardsRedeemed', (SELECT count(*)::int FROM rewards WHERE tenant_id = p_tenant_id AND redeemed_at IS NOT NULL),
    'rewardsPending', (SELECT count(*)::int FROM rewards WHERE tenant_id = p_tenant_id AND redeemed_at IS NULL),
    'productCount', (SELECT count(*)::int FROM products WHERE tenant_id = p_tenant_id),
    'campaignCount', (SELECT count(*)::int FROM campaigns WHERE tenant_id = p_tenant_id),
    'totalStampsIssued', (SELECT COALESCE(sum(total_stamps), 0)::int FROM clients WHERE tenant_id = p_tenant_id),
    'lastScanAt', (SELECT max(scanned_at) FROM scan_logs WHERE tenant_id = p_tenant_id),
    'lastEnrolmentAt', (SELECT max(enrolled_at) FROM clients WHERE tenant_id = p_tenant_id),
    'owner', (
      SELECT jsonb_build_object('id', pr.id, 'fullName', pr.full_name, 'email', pr.email, 'isActive', pr.is_active)
      FROM profiles pr WHERE pr.tenant_id = p_tenant_id AND pr.role = 'owner' LIMIT 1
    ),
    'workers', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', pr.id,
        'fullName', pr.full_name,
        'email', pr.email,
        'isActive', pr.is_active,
        'scanCount', (SELECT count(*)::int FROM scan_logs s WHERE s.worker_id = pr.id AND s.status = 'approved')
      ) ORDER BY pr.full_name), '[]'::jsonb)
      FROM profiles pr WHERE pr.tenant_id = p_tenant_id AND pr.role = 'worker'
    ),
    'recentScans', (
      SELECT COALESCE(jsonb_agg(row_data ORDER BY scanned_at DESC), '[]'::jsonb)
      FROM (
        SELECT
          jsonb_build_object(
            'id', s.id,
            'clientName', c.full_name,
            'workerName', w.full_name,
            'status', s.status,
            'stampsAdded', s.stamps_added,
            'rewardTriggered', s.reward_triggered,
            'scannedAt', s.scanned_at
          ) AS row_data,
          s.scanned_at
        FROM scan_logs s
        LEFT JOIN clients c ON c.id = s.client_id
        LEFT JOIN profiles w ON w.id = s.worker_id
        WHERE s.tenant_id = p_tenant_id
        ORDER BY s.scanned_at DESC
        LIMIT 15
      ) recent
    ),
    'recentClients', (
      SELECT COALESCE(jsonb_agg(row_data ORDER BY enrolled_at DESC), '[]'::jsonb)
      FROM (
        SELECT
          jsonb_build_object(
            'id', c.id,
            'fullName', c.full_name,
            'cardCode', c.card_code,
            'totalStamps', c.total_stamps,
            'enrolledAt', c.enrolled_at
          ) AS row_data,
          c.enrolled_at
        FROM clients c
        WHERE c.tenant_id = p_tenant_id
        ORDER BY c.enrolled_at DESC
        LIMIT 10
      ) recent
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
        'chargilyPaymentId', sub.chargily_payment_id,
        'createdAt', sub.created_at
      ) ORDER BY sub.created_at DESC), '[]'::jsonb)
      FROM subscriptions sub WHERE sub.tenant_id = p_tenant_id
    ),
    'receipts', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', r.id,
        'planId', r.plan_id,
        'amountDzd', r.amount_dzd,
        'paymentMethod', r.payment_method,
        'status', r.status,
        'createdAt', r.created_at
      ) ORDER BY r.created_at DESC), '[]'::jsonb)
      FROM payment_receipts r WHERE r.tenant_id = p_tenant_id
    ),
    'shopSettings', (
      SELECT jsonb_build_object(
        'currency', ss.currency,
        'timezone', ss.timezone,
        'clientLanguage', ss.client_language,
        'stampThreshold', ss.stamp_threshold,
        'maxScansPerDay', ss.max_scans_per_day,
        'whatsappConfigured', ss.whatsapp_token IS NOT NULL AND ss.whatsapp_phone_id IS NOT NULL,
        'emailConfigured', ss.email_sender IS NOT NULL
      )
      FROM shop_settings ss WHERE ss.tenant_id = p_tenant_id
    )
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Dedicated analytics payload for /platform/analytics
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_platform_analytics()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN jsonb_build_object(
    'topByClients', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'tenantId', sub.id, 'name', sub.name, 'slug', sub.slug, 'value', sub.cnt
      ) ORDER BY sub.cnt DESC), '[]'::jsonb)
      FROM (
        SELECT t.id, t.name, t.slug, count(c.id)::int AS cnt
        FROM tenants t
        LEFT JOIN clients c ON c.tenant_id = t.id
        GROUP BY t.id, t.name, t.slug
        ORDER BY cnt DESC
        LIMIT 15
      ) sub
    ),
    'topByScans', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'tenantId', sub.id, 'name', sub.name, 'slug', sub.slug, 'value', sub.cnt
      ) ORDER BY sub.cnt DESC), '[]'::jsonb)
      FROM (
        SELECT t.id, t.name, t.slug, count(s.id)::int AS cnt
        FROM tenants t
        LEFT JOIN scan_logs s ON s.tenant_id = t.id AND s.status = 'approved'
        GROUP BY t.id, t.name, t.slug
        ORDER BY cnt DESC
        LIMIT 15
      ) sub
    ),
    'topByGrowth7d', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'tenantId', sub.id, 'name', sub.name, 'slug', sub.slug, 'value', sub.cnt
      ) ORDER BY sub.cnt DESC), '[]'::jsonb)
      FROM (
        SELECT t.id, t.name, t.slug, count(c.id)::int AS cnt
        FROM tenants t
        LEFT JOIN clients c ON c.tenant_id = t.id AND c.enrolled_at >= now() - interval '7 days'
        GROUP BY t.id, t.name, t.slug
        HAVING count(c.id) > 0
        ORDER BY cnt DESC
        LIMIT 15
      ) sub
    ),
    'topByRevenue', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'tenantId', tenant_id, 'name', name, 'slug', slug, 'value', revenue
      ) ORDER BY revenue DESC), '[]'::jsonb)
      FROM (
        SELECT t.id AS tenant_id, t.name, t.slug,
          COALESCE((
            SELECT sum(r.amount_dzd)::int FROM payment_receipts r
            WHERE r.tenant_id = t.id AND r.status = 'approved'
          ), 0) AS revenue
        FROM tenants t
        ORDER BY revenue DESC
        LIMIT 15
      ) x
    ),
    'workerLeaderboard', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'workerId', sub.id,
        'workerName', sub.full_name,
        'tenantName', t.name,
        'scanCount', sub.cnt
      ) ORDER BY sub.cnt DESC), '[]'::jsonb)
      FROM (
        SELECT w.id, w.full_name, w.tenant_id, count(s.id)::int AS cnt
        FROM profiles w
        JOIN scan_logs s ON s.worker_id = w.id AND s.status = 'approved'
        WHERE w.role = 'worker'
        GROUP BY w.id, w.full_name, w.tenant_id
        ORDER BY cnt DESC
        LIMIT 20
      ) sub
      JOIN tenants t ON t.id = sub.tenant_id
    ),
    'planEconomics', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'planId', p.id,
        'planName', p.name,
        'tenantCount', (SELECT count(*)::int FROM tenants t WHERE t.plan_id = p.id),
        'activeCount', (SELECT count(*)::int FROM tenants t WHERE t.plan_id = p.id AND t.subscription_status = 'active'),
        'monthlyPriceDzd', p.price_monthly_dzd,
        'mrrDzd', (
          SELECT COALESCE(sum(pl.price_monthly_dzd), 0)::int
          FROM tenants t2 JOIN plans pl ON pl.id = t2.plan_id
          WHERE t2.plan_id = p.id AND t2.subscription_status = 'active'
        )
      ) ORDER BY p.sort_order), '[]'::jsonb)
      FROM plans p WHERE p.id != 'trial'
    ),
    'healthScores', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'tenantId', t.id,
        'name', t.name,
        'slug', t.slug,
        'clientCount', (SELECT count(*)::int FROM clients c WHERE c.tenant_id = t.id),
        'scanCount30d', (
          SELECT count(*)::int FROM scan_logs s
          WHERE s.tenant_id = t.id AND s.scanned_at >= now() - interval '30 days' AND s.status = 'approved'
        ),
        'daysSinceLastScan', (
          SELECT CASE WHEN max(s.scanned_at) IS NULL THEN NULL
            ELSE extract(day FROM now() - max(s.scanned_at))::int END
          FROM scan_logs s WHERE s.tenant_id = t.id
        ),
        'onboardingComplete', t.onboarding_complete,
        'subscriptionStatus', t.subscription_status
      ) ORDER BY t.created_at DESC), '[]'::jsonb)
      FROM tenants t
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_tenants() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_tenant_detail(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_analytics() TO authenticated;
