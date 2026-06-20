-- Fix get_platform_overview: jsonb_build_object is limited to 100 arguments (50 pairs).
-- The overview payload has 59 pairs — split into two objects merged with ||.

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
  INTO v_signups FROM (
    SELECT date_trunc('day', created_at) AS d, count(*)::int AS c
    FROM tenants WHERE created_at >= now() - interval '30 days' GROUP BY 1
  ) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', to_char(d, 'YYYY-MM-DD'), 'count', c) ORDER BY d), '[]'::jsonb)
  INTO v_scans FROM (
    SELECT date_trunc('day', scanned_at) AS d, count(*)::int AS c
    FROM scan_logs WHERE scanned_at >= now() - interval '30 days' AND status = 'approved' GROUP BY 1
  ) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', to_char(d, 'YYYY-MM-DD'), 'count', c) ORDER BY d), '[]'::jsonb)
  INTO v_enrolments FROM (
    SELECT date_trunc('day', enrolled_at) AS d, count(*)::int AS c
    FROM clients WHERE enrolled_at >= now() - interval '30 days' GROUP BY 1
  ) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', to_char(d, 'YYYY-MM-DD'), 'amountDzd', amt) ORDER BY d), '[]'::jsonb)
  INTO v_revenue_month FROM (
    SELECT date_trunc('day', created_at) AS d, sum(amount_dzd)::int AS amt
    FROM payment_receipts WHERE status = 'approved' AND created_at >= now() - interval '30 days'
    GROUP BY 1
  ) r;

  RETURN
    jsonb_build_object(
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
        WHERE subscription_status = 'trialing' AND trial_ends_at IS NOT NULL
          AND trial_ends_at <= now() + interval '7 days' AND trial_ends_at > now()
      ),
      'onboardingCompleteCount', (SELECT count(*)::int FROM tenants WHERE onboarding_complete = true),
      'tutorialCompleteCount', (SELECT count(*)::int FROM tenants WHERE dashboard_tutorial_complete = true),
      'totalClients', (SELECT count(*)::int FROM clients),
      'activeCards', (SELECT count(*)::int FROM clients WHERE is_blocked = false),
      'blockedCards', (SELECT count(*)::int FROM clients WHERE is_blocked = true),
      'clientsEnrolledToday', (SELECT count(*)::int FROM clients WHERE enrolled_at >= date_trunc('day', now())),
      'clientsEnrolledThisWeek', (SELECT count(*)::int FROM clients WHERE enrolled_at >= date_trunc('week', now())),
      'clientsEnrolledThisMonth', (SELECT count(*)::int FROM clients WHERE enrolled_at >= date_trunc('month', now())),
      'totalScans', (SELECT count(*)::int FROM scan_logs WHERE status = 'approved'),
      'scansToday', (SELECT count(*)::int FROM scan_logs WHERE scanned_at >= date_trunc('day', now()) AND status = 'approved'),
      'scansThisWeek', (SELECT count(*)::int FROM scan_logs WHERE scanned_at >= date_trunc('week', now()) AND status = 'approved'),
      'scansThisMonth', (SELECT count(*)::int FROM scan_logs WHERE scanned_at >= date_trunc('month', now()) AND status = 'approved'),
      'fraudScansTotal', (SELECT count(*)::int FROM scan_logs WHERE status != 'approved'),
      'fraudScansToday', (SELECT count(*)::int FROM scan_logs WHERE scanned_at >= date_trunc('day', now()) AND status != 'approved'),
      'totalRewards', (SELECT count(*)::int FROM rewards),
      'rewardsRedeemed', (SELECT count(*)::int FROM rewards WHERE redeemed_at IS NOT NULL),
      'rewardsPending', (SELECT count(*)::int FROM rewards WHERE redeemed_at IS NULL),
      'totalWorkers', (SELECT count(*)::int FROM profiles WHERE role = 'worker'),
      'activeWorkers', (SELECT count(*)::int FROM profiles WHERE role = 'worker' AND is_active = true),
      'totalOwners', (SELECT count(*)::int FROM profiles WHERE role = 'owner'),
      'totalProducts', (SELECT count(*)::int FROM products),
      'activeProducts', (SELECT count(*)::int FROM products WHERE is_active = true),
      'totalCampaigns', (SELECT count(*)::int FROM campaigns),
      'pendingReceipts', (SELECT count(*)::int FROM payment_receipts WHERE status = 'pending'),
      'approvedReceipts', (SELECT count(*)::int FROM payment_receipts WHERE status = 'approved'),
      'rejectedReceipts', (SELECT count(*)::int FROM payment_receipts WHERE status = 'rejected'),
      'activeSubscriptions', (SELECT count(*)::int FROM subscriptions WHERE status = 'active'),
      'pendingSubscriptions', (SELECT count(*)::int FROM subscriptions WHERE status = 'pending'),
      'estimatedMrrDzd', (
        SELECT COALESCE(sum(p.price_monthly_dzd), 0)::int FROM tenants t
        JOIN plans p ON p.id = t.plan_id WHERE t.subscription_status = 'active' AND p.price_monthly_dzd IS NOT NULL
      ),
      'estimatedArrDzd', (
        SELECT COALESCE(sum(p.price_monthly_dzd), 0)::int * 12 FROM tenants t
        JOIN plans p ON p.id = t.plan_id WHERE t.subscription_status = 'active' AND p.price_monthly_dzd IS NOT NULL
      ),
      'revenueApprovedTotalDzd', (SELECT COALESCE(sum(amount_dzd), 0)::int FROM payment_receipts WHERE status = 'approved'),
      'revenueApprovedThisMonthDzd', (
        SELECT COALESCE(sum(amount_dzd), 0)::int FROM payment_receipts
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
      'avgClientsPerTenant', (
        SELECT CASE WHEN count(*) > 0 THEN round((SELECT count(*)::numeric FROM clients) / count(*), 1) ELSE 0 END FROM tenants
      ),
      'avgScansPerTenant', (
        SELECT CASE WHEN count(*) > 0 THEN round((SELECT count(*)::numeric FROM scan_logs WHERE status = 'approved') / count(*), 1) ELSE 0 END FROM tenants
      ),
      'avgWorkersPerTenant', (
        SELECT CASE WHEN count(*) > 0 THEN round((SELECT count(*)::numeric FROM profiles WHERE role = 'worker' AND is_active = true) / count(*), 1) ELSE 0 END FROM tenants
      ),
      'onboardingRate', (
        SELECT CASE WHEN count(*) > 0 THEN round(100.0 * count(*) FILTER (WHERE onboarding_complete) / count(*), 1) ELSE 0 END FROM tenants
      ),
      'trialToPaidRate', (
        SELECT CASE WHEN count(*) > 0 THEN round(100.0 * count(*) FILTER (WHERE subscription_status = 'active' AND plan_id != 'trial') / count(*), 1) ELSE 0 END FROM tenants
      ),
      'fraudRate', (
        SELECT CASE WHEN count(*) > 0 THEN round(100.0 * count(*) FILTER (WHERE status != 'approved') / count(*), 2) ELSE 0 END FROM scan_logs
      ),
      'rewardRedemptionRate', (
        SELECT CASE WHEN count(*) > 0 THEN round(100.0 * count(*) FILTER (WHERE redeemed_at IS NOT NULL) / count(*), 1) ELSE 0 END FROM rewards
      ),
      'monthlyChurnCount', (
        SELECT count(*)::int FROM tenants
        WHERE subscription_status = 'canceled'
          AND updated_at >= date_trunc('month', now())
      ),
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
          'planId', sub.plan_id, 'planName', p.name, 'tenantCount', sub.cnt, 'mrrDzd', sub.mrr
        ) ORDER BY sub.mrr DESC), '[]'::jsonb)
        FROM (
          SELECT t.plan_id, count(*)::int AS cnt, COALESCE(sum(p.price_monthly_dzd), 0)::int AS mrr
          FROM tenants t JOIN plans p ON p.id = t.plan_id
          WHERE t.subscription_status = 'active' GROUP BY t.plan_id
        ) sub JOIN plans p ON p.id = sub.plan_id
      ),
      'signupsByDay', v_signups,
      'scansByDay', v_scans,
      'enrolmentsByDay', v_enrolments,
      'revenueByDay', v_revenue_month
    );
END;
$$;
