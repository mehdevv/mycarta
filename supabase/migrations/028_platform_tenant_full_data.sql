-- Full per-business data: paginated clients/scans + richer tenant list

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
        t.updated_at AS "updatedAt",
        t.owner_phone AS "ownerPhone",
        t.billing_full_name AS "billingFullName",
        t.billing_phone AS "billingPhone",
        t.billing_email AS "billingEmail",
        t.affiliate_code_used AS "affiliateCodeUsed",
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
        (SELECT pr.phone FROM profiles pr WHERE pr.tenant_id = t.id AND pr.role = 'owner' LIMIT 1) AS "ownerProfilePhone",
        (SELECT rep.full_name FROM profiles rep WHERE rep.id = t.assigned_sales_rep_id) AS "assignedRepName",
        (SELECT aff.full_name FROM profiles aff WHERE aff.id = t.referred_affiliate_id) AS "affiliateName",
        p.price_monthly_dzd AS "planMonthlyDzd"
      FROM tenants t
      LEFT JOIN plans p ON p.id = t.plan_id
    ) x
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_platform_tenant_clients(
  p_tenant_id UUID,
  p_limit INT DEFAULT 200,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total INT;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT count(*)::int INTO v_total FROM clients WHERE tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'total', v_total,
    'limit', p_limit,
    'offset', p_offset,
    'items', (
      SELECT COALESCE(jsonb_agg(row_to_json(c) ORDER BY c."enrolledAt" DESC), '[]'::jsonb)
      FROM (
        SELECT
          cl.id,
          cl.full_name AS "fullName",
          cl.phone,
          cl.email,
          cl.card_code AS "cardCode",
          cl.card_url AS "cardUrl",
          cl.total_stamps AS "totalStamps",
          cl.current_cycle_stamps AS "currentCycleStamps",
          cl.total_rewards_earned AS "totalRewardsEarned",
          cl.current_cycle_spend_dzd AS "currentCycleSpendDzd",
          cl.total_spend_dzd AS "totalSpendDzd",
          cl.is_blocked AS "isBlocked",
          cl.notes,
          cl.enrolled_at AS "enrolledAt",
          cl.last_scan_at AS "lastScanAt",
          cl.created_at AS "createdAt",
          cl.updated_at AS "updatedAt"
        FROM clients cl
        WHERE cl.tenant_id = p_tenant_id
        ORDER BY cl.enrolled_at DESC
        LIMIT greatest(1, least(p_limit, 500))
        OFFSET greatest(0, p_offset)
      ) c
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_platform_tenant_scans(
  p_tenant_id UUID,
  p_limit INT DEFAULT 200,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total INT;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT count(*)::int INTO v_total FROM scan_logs WHERE tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'total', v_total,
    'limit', p_limit,
    'offset', p_offset,
    'items', (
      SELECT COALESCE(jsonb_agg(row_to_json(s) ORDER BY s."scannedAt" DESC), '[]'::jsonb)
      FROM (
        SELECT
          sl.id,
          c.full_name AS "clientName",
          c.card_code AS "clientCardCode",
          w.full_name AS "workerName",
          sl.scan_type AS "scanType",
          sl.status,
          sl.block_reason AS "blockReason",
          sl.stamps_added AS "stampsAdded",
          sl.spend_added_dzd AS "spendAddedDzd",
          sl.purchase_amount_dzd AS "purchaseAmountDzd",
          sl.reward_triggered AS "rewardTriggered",
          sl.review_notes AS "reviewNotes",
          sl.scanned_at AS "scannedAt",
          sl.created_at AS "createdAt"
        FROM scan_logs sl
        LEFT JOIN clients c ON c.id = sl.client_id
        LEFT JOIN profiles w ON w.id = sl.worker_id
        WHERE sl.tenant_id = p_tenant_id
        ORDER BY sl.scanned_at DESC
        LIMIT greatest(1, least(p_limit, 500))
        OFFSET greatest(0, p_offset)
      ) s
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_tenants() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_tenant_clients(UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_tenant_scans(UUID, INT, INT) TO authenticated;
