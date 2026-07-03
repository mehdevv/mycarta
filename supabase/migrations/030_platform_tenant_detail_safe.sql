-- Ensure columns/tables referenced by platform tenant detail exist, then fix RPC aggregations.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS affiliate_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_handle TEXT;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS owner_phone TEXT,
  ADD COLUMN IF NOT EXISTS billing_full_name TEXT,
  ADD COLUMN IF NOT EXISTS billing_phone TEXT,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS billing_address TEXT,
  ADD COLUMN IF NOT EXISTS assigned_sales_rep_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referred_affiliate_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS affiliate_code_used TEXT,
  ADD COLUMN IF NOT EXISTS affiliate_first_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS affiliate_benefit_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS affiliate_commission_payments_count INT NOT NULL DEFAULT 0;

ALTER TABLE shop_settings
  ADD COLUMN IF NOT EXISTS stamps_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS spend_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS spend_threshold_dzd INT,
  ADD COLUMN IF NOT EXISTS collect_client_email BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS card_design_id TEXT;

ALTER TABLE scan_logs
  ADD COLUMN IF NOT EXISTS purchase_amount_dzd INT;

ALTER TABLE plans ADD COLUMN IF NOT EXISTS location_limit INT;

CREATE OR REPLACE FUNCTION public.get_platform_tenant_detail(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant tenants%ROWTYPE;
  v_plan_name TEXT;
  v_plan_monthly INT;
  v_plan_annual INT;
  v_plan_client_limit INT;
  v_plan_worker_limit INT;
  v_plan_campaign_limit INT;
  v_plan_location_limit INT;
  v_sales_commissions JSONB := '[]'::jsonb;
  v_affiliate_commissions JSONB := '[]'::jsonb;
  v_sales_follow_up JSONB := NULL;
  v_result JSONB;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO v_tenant FROM tenants WHERE id = p_tenant_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT
    p.name,
    p.price_monthly_dzd,
    p.price_annual_dzd,
    p.client_limit,
    p.worker_limit,
    p.campaign_limit,
    p.location_limit
  INTO
    v_plan_name,
    v_plan_monthly,
    v_plan_annual,
    v_plan_client_limit,
    v_plan_worker_limit,
    v_plan_campaign_limit,
    v_plan_location_limit
  FROM plans p
  WHERE p.id = v_tenant.plan_id;

  BEGIN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', sc.id,
      'repName', rep.full_name,
      'planId', sc.plan_id,
      'amountDzd', sc.amount_dzd,
      'commissionDzd', sc.commission_dzd,
      'commissionRate', sc.commission_rate,
      'status', sc.status,
      'createdAt', sc.created_at
    ) ORDER BY sc.created_at DESC), '[]'::jsonb)
    INTO v_sales_commissions
    FROM sales_commissions sc
    JOIN profiles rep ON rep.id = sc.rep_id
    WHERE sc.tenant_id = p_tenant_id;
  EXCEPTION
    WHEN undefined_table THEN
      v_sales_commissions := '[]'::jsonb;
  END;

  BEGIN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', ac.id,
      'affiliateName', aff.full_name,
      'affiliateCode', aff.affiliate_code,
      'planId', ac.plan_id,
      'amountDzd', ac.amount_dzd,
      'commissionDzd', ac.commission_dzd,
      'commissionRate', ac.commission_rate,
      'paymentPeriod', ac.payment_period,
      'status', ac.status,
      'createdAt', ac.created_at
    ) ORDER BY ac.created_at DESC), '[]'::jsonb)
    INTO v_affiliate_commissions
    FROM affiliate_commissions ac
    JOIN profiles aff ON aff.id = ac.affiliate_id
    WHERE ac.tenant_id = p_tenant_id;
  EXCEPTION
    WHEN undefined_table THEN
      v_affiliate_commissions := '[]'::jsonb;
  END;

  BEGIN
    SELECT jsonb_build_object(
      'status', sf.status,
      'priority', sf.priority,
      'notes', sf.notes,
      'nextFollowUpAt', sf.next_follow_up_at,
      'lastContactAt', sf.last_contact_at,
      'upsellPlanId', sf.upsell_plan_id
    )
    INTO v_sales_follow_up
    FROM sales_follow_ups sf
    WHERE sf.tenant_id = p_tenant_id
    LIMIT 1;
  EXCEPTION
    WHEN undefined_table THEN
      v_sales_follow_up := NULL;
  END;

  v_result := jsonb_build_object(
    'id', v_tenant.id,
    'slug', v_tenant.slug,
    'name', v_tenant.name,
    'logoUrl', v_tenant.logo_url,
    'planId', v_tenant.plan_id,
    'planName', COALESCE(v_plan_name, v_tenant.plan_id),
    'planMonthlyDzd', v_plan_monthly,
    'planAnnualDzd', v_plan_annual,
    'planClientLimit', v_plan_client_limit,
    'planWorkerLimit', v_plan_worker_limit,
    'planCampaignLimit', v_plan_campaign_limit,
    'planLocationLimit', v_plan_location_limit,
    'subscriptionStatus', v_tenant.subscription_status,
    'trialEndsAt', v_tenant.trial_ends_at,
    'subscriptionEndsAt', v_tenant.subscription_ends_at,
    'onboardingComplete', v_tenant.onboarding_complete,
    'dashboardTutorialComplete', v_tenant.dashboard_tutorial_complete,
    'brandColor', v_tenant.brand_color,
    'chargilyCustomerId', v_tenant.chargily_customer_id,
    'createdAt', v_tenant.created_at,
    'updatedAt', v_tenant.updated_at,
    'ownerPhone', v_tenant.owner_phone,
    'billing', jsonb_build_object(
      'fullName', v_tenant.billing_full_name,
      'phone', v_tenant.billing_phone,
      'email', v_tenant.billing_email,
      'address', v_tenant.billing_address
    ),
    'salesRep', (
      SELECT jsonb_build_object(
        'id', rep.id,
        'fullName', rep.full_name,
        'email', rep.email,
        'phone', rep.phone
      )
      FROM profiles rep
      WHERE rep.id = v_tenant.assigned_sales_rep_id
    ),
    'salesFollowUp', v_sales_follow_up,
    'affiliate', (
      SELECT jsonb_build_object(
        'id', aff.id,
        'fullName', aff.full_name,
        'affiliateCode', aff.affiliate_code,
        'socialHandle', aff.social_handle
      )
      FROM profiles aff
      WHERE aff.id = v_tenant.referred_affiliate_id
    ),
    'affiliateCodeUsed', v_tenant.affiliate_code_used,
    'affiliateFirstPaidAt', v_tenant.affiliate_first_paid_at,
    'affiliateBenefitEndsAt', v_tenant.affiliate_benefit_ends_at,
    'affiliateCommissionPaymentsCount', v_tenant.affiliate_commission_payments_count
  ) || jsonb_build_object(
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
    'totalRevenueApprovedDzd', (
      SELECT COALESCE(sum(amount_dzd), 0)::int FROM payment_receipts
      WHERE tenant_id = p_tenant_id AND status = 'approved'
    ),
    'lastScanAt', (SELECT max(scanned_at) FROM scan_logs WHERE tenant_id = p_tenant_id),
    'lastEnrolmentAt', (SELECT max(enrolled_at) FROM clients WHERE tenant_id = p_tenant_id)
  ) || jsonb_build_object(
    'owner', (
      SELECT jsonb_build_object(
        'id', pr.id,
        'fullName', pr.full_name,
        'email', pr.email,
        'phone', pr.phone,
        'isActive', pr.is_active,
        'createdAt', pr.created_at
      )
      FROM profiles pr WHERE pr.tenant_id = p_tenant_id AND pr.role = 'owner' LIMIT 1
    ),
    'workers', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', pr.id,
        'fullName', pr.full_name,
        'email', pr.email,
        'phone', pr.phone,
        'isActive', pr.is_active,
        'createdAt', pr.created_at,
        'scanCount', (SELECT count(*)::int FROM scan_logs s WHERE s.worker_id = pr.id AND s.status = 'approved')
      ) ORDER BY pr.full_name), '[]'::jsonb)
      FROM profiles pr WHERE pr.tenant_id = p_tenant_id AND pr.role = 'worker'
    ),
    'recentScans', (
      SELECT COALESCE(jsonb_agg(row_data ORDER BY scanned_at DESC), '[]'::jsonb)
      FROM (
        SELECT
          jsonb_build_object(
            'id', sl.id,
            'clientName', c.full_name,
            'workerName', w.full_name,
            'status', sl.status,
            'blockReason', sl.block_reason,
            'stampsAdded', sl.stamps_added,
            'purchaseAmountDzd', sl.purchase_amount_dzd,
            'rewardTriggered', sl.reward_triggered,
            'scannedAt', sl.scanned_at
          ) AS row_data,
          sl.scanned_at
        FROM scan_logs sl
        LEFT JOIN clients c ON c.id = sl.client_id
        LEFT JOIN profiles w ON w.id = sl.worker_id
        WHERE sl.tenant_id = p_tenant_id
        ORDER BY sl.scanned_at DESC
        LIMIT 50
      ) recent
    ),
    'fraudScans', (
      SELECT COALESCE(jsonb_agg(row_data ORDER BY scanned_at DESC), '[]'::jsonb)
      FROM (
        SELECT
          jsonb_build_object(
            'id', sl.id,
            'clientName', c.full_name,
            'workerName', w.full_name,
            'status', sl.status,
            'blockReason', sl.block_reason,
            'scannedAt', sl.scanned_at
          ) AS row_data,
          sl.scanned_at
        FROM scan_logs sl
        LEFT JOIN clients c ON c.id = sl.client_id
        LEFT JOIN profiles w ON w.id = sl.worker_id
        WHERE sl.tenant_id = p_tenant_id AND sl.status != 'approved'
        ORDER BY sl.scanned_at DESC
        LIMIT 30
      ) fraud
    ),
    'recentClients', (
      SELECT COALESCE(jsonb_agg(row_data ORDER BY enrolled_at DESC), '[]'::jsonb)
      FROM (
        SELECT
          jsonb_build_object(
            'id', cl.id,
            'fullName', cl.full_name,
            'phone', cl.phone,
            'email', cl.email,
            'cardCode', cl.card_code,
            'totalStamps', cl.total_stamps,
            'currentCycleStamps', cl.current_cycle_stamps,
            'totalRewardsEarned', cl.total_rewards_earned,
            'isBlocked', cl.is_blocked,
            'enrolledAt', cl.enrolled_at,
            'lastScanAt', cl.last_scan_at
          ) AS row_data,
          cl.enrolled_at
        FROM clients cl
        WHERE cl.tenant_id = p_tenant_id
        ORDER BY cl.enrolled_at DESC
        LIMIT 100
      ) recent
    ),
    'products', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'sku', p.sku,
        'category', p.category,
        'price', p.price,
        'isActive', p.is_active,
        'createdAt', p.created_at
      ) ORDER BY p.name), '[]'::jsonb)
      FROM products p WHERE p.tenant_id = p_tenant_id
    ),
    'recentRewards', (
      SELECT COALESCE(jsonb_agg(row_data ORDER BY created_at DESC), '[]'::jsonb)
      FROM (
        SELECT
          jsonb_build_object(
            'id', rw.id,
            'clientName', c.full_name,
            'rewardDescription', rw.reward_description,
            'redeemedAt', rw.redeemed_at,
            'createdAt', rw.created_at
          ) AS row_data,
          rw.created_at
        FROM rewards rw
        JOIN clients c ON c.id = rw.client_id
        WHERE rw.tenant_id = p_tenant_id
        ORDER BY rw.created_at DESC
        LIMIT 30
      ) recent
    ),
    'campaigns', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', cam.id,
        'name', cam.name,
        'channel', cam.channel,
        'status', cam.status,
        'totalRecipients', cam.total_recipients,
        'totalSent', cam.total_sent,
        'scheduledAt', cam.scheduled_at,
        'sentAt', cam.sent_at,
        'createdAt', cam.created_at
      ) ORDER BY cam.created_at DESC), '[]'::jsonb)
      FROM campaigns cam WHERE cam.tenant_id = p_tenant_id
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
        'chargilyCheckoutId', sub.chargily_checkout_id,
        'chargilyPaymentId', sub.chargily_payment_id,
        'createdAt', sub.created_at
      ) ORDER BY sub.created_at DESC), '[]'::jsonb)
      FROM subscriptions sub WHERE sub.tenant_id = p_tenant_id
    ),
    'receipts', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', r.id,
        'planId', r.plan_id,
        'billingPeriod', r.billing_period,
        'amountDzd', r.amount_dzd,
        'paymentMethod', r.payment_method,
        'receiptUrl', r.receipt_url,
        'status', r.status,
        'reviewerNotes', r.reviewer_notes,
        'reviewedAt', r.reviewed_at,
        'createdAt', r.created_at
      ) ORDER BY r.created_at DESC), '[]'::jsonb)
      FROM payment_receipts r WHERE r.tenant_id = p_tenant_id
    ),
    'salesCommissions', v_sales_commissions,
    'affiliateCommissions', v_affiliate_commissions,
    'shopSettings', (
      SELECT jsonb_build_object(
        'businessName', ss.business_name,
        'currency', ss.currency,
        'timezone', ss.timezone,
        'clientLanguage', ss.client_language,
        'stampThreshold', ss.stamp_threshold,
        'maxScansPerDay', ss.max_scans_per_day,
        'rewardType', ss.reward_type,
        'rewardValue', ss.reward_value,
        'stampsEnabled', ss.stamps_enabled,
        'spendEnabled', ss.spend_enabled,
        'spendThresholdDzd', ss.spend_threshold_dzd,
        'collectClientEmail', ss.collect_client_email,
        'trackProducts', ss.track_products,
        'cardDesignId', ss.card_design_id,
        'primaryColor', ss.primary_color,
        'secondaryColor', ss.secondary_color,
        'whatsappConfigured', ss.whatsapp_token IS NOT NULL AND ss.whatsapp_phone_id IS NOT NULL,
        'emailConfigured', ss.email_sender IS NOT NULL,
        'createdAt', ss.created_at,
        'updatedAt', ss.updated_at
      )
      FROM shop_settings ss WHERE ss.tenant_id = p_tenant_id
    )
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'get_platform_tenant_detail: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_tenant_detail(UUID) TO authenticated;
