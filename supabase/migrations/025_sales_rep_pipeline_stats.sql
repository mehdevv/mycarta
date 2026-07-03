-- Enrich sales rep pipeline with subscription + client stats

CREATE OR REPLACE FUNCTION public.get_sales_rep_pipeline()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_sales_rep() AND NOT is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN (
    SELECT coalesce(jsonb_agg(row_to_json(x) ORDER BY x.days_left ASC NULLS LAST, x.next_follow_up_at ASC NULLS LAST), '[]'::jsonb)
    FROM (
      SELECT
        t.id AS tenant_id,
        t.slug,
        t.name AS business_name,
        t.plan_id,
        t.subscription_status,
        t.trial_ends_at,
        t.subscription_ends_at,
        t.owner_phone,
        t.billing_full_name,
        t.billing_phone,
        t.billing_email,
        t.onboarding_complete,
        t.created_at AS tenant_created_at,
        t.assigned_sales_rep_id AS rep_id,
        p.full_name AS owner_name,
        p.email AS owner_email,
        p.phone AS owner_profile_phone,
        f.id AS follow_up_id,
        coalesce(f.status, 'new') AS status,
        coalesce(f.priority, 'normal') AS priority,
        f.next_follow_up_at,
        f.last_contact_at,
        f.notes,
        f.upsell_plan_id,
        (SELECT count(*)::int FROM clients c WHERE c.tenant_id = t.id AND NOT c.is_blocked) AS client_count,
        (SELECT count(*)::int FROM profiles w WHERE w.tenant_id = t.id AND w.role = 'worker' AND w.is_active) AS worker_count,
        (SELECT count(*)::int FROM clients c WHERE c.tenant_id = t.id AND c.enrolled_at >= now() - interval '7 days') AS new_clients_7d,
        (SELECT count(*)::int FROM scan_logs s WHERE s.tenant_id = t.id AND s.status = 'approved' AND s.scanned_at >= now() - interval '7 days') AS scans_7d,
        (SELECT count(*)::int FROM scan_logs s WHERE s.tenant_id = t.id AND s.status = 'approved' AND s.scanned_at >= date_trunc('day', now())) AS scans_today,
        (SELECT max(s.scanned_at) FROM scan_logs s WHERE s.tenant_id = t.id) AS last_scan_at,
        sub.id AS active_subscription_id,
        coalesce(sub.plan_id, t.plan_id) AS active_sub_plan_id,
        sub.billing_period AS active_sub_billing_period,
        sub.amount_dzd AS active_sub_amount_dzd,
        sub.ends_at AS active_sub_ends_at,
        sub.starts_at AS active_sub_starts_at,
        CASE
          WHEN t.subscription_status = 'trialing' THEN 'trial'
          WHEN sub.id IS NOT NULL OR t.subscription_status = 'active' THEN 'paid'
          ELSE t.subscription_status
        END AS access_type,
        CASE
          WHEN t.subscription_status = 'trialing' AND t.trial_ends_at IS NOT NULL THEN t.trial_ends_at
          WHEN sub.ends_at IS NOT NULL THEN sub.ends_at
          WHEN t.subscription_ends_at IS NOT NULL THEN t.subscription_ends_at
          ELSE NULL
        END AS access_ends_at,
        CASE
          WHEN t.subscription_status = 'trialing' AND t.trial_ends_at IS NOT NULL
            THEN greatest(0, ceil(extract(epoch FROM t.trial_ends_at - now()) / 86400.0))::int
          WHEN sub.ends_at IS NOT NULL
            THEN greatest(0, ceil(extract(epoch FROM sub.ends_at - now()) / 86400.0))::int
          WHEN t.subscription_ends_at IS NOT NULL
            THEN greatest(0, ceil(extract(epoch FROM t.subscription_ends_at - now()) / 86400.0))::int
          ELSE NULL
        END AS days_left,
        coalesce((
          SELECT sum(c.commission_dzd)::int
          FROM sales_commissions c
          WHERE c.tenant_id = t.id
            AND c.rep_id = t.assigned_sales_rep_id
            AND c.status = 'pending'
        ), 0) AS pending_commission_dzd
      FROM tenants t
      LEFT JOIN profiles p ON p.tenant_id = t.id AND p.role = 'owner'
      LEFT JOIN sales_follow_ups f ON f.tenant_id = t.id
      LEFT JOIN LATERAL (
        SELECT s.id, s.plan_id, s.billing_period, s.amount_dzd, s.ends_at, s.starts_at
        FROM subscriptions s
        WHERE s.tenant_id = t.id AND s.status = 'active'
        ORDER BY s.ends_at DESC NULLS LAST
        LIMIT 1
      ) sub ON true
      WHERE t.assigned_sales_rep_id IS NOT NULL
        AND (is_super_admin() OR t.assigned_sales_rep_id = auth.uid())
    ) x
  );
END;
$$;
