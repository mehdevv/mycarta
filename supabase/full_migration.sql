-- =============================================================================
-- mycarta / LoyalQR -- FULL DATABASE MIGRATION (greenfield Supabase project)
-- =============================================================================
-- Run once in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Project: dunmzwligaqhrpoeagap (update if different)
--
-- WARNING: For an EMPTY project only. Do not re-run on a populated database.
-- =============================================================================
-- mycarta SaaS â€” complete multi-tenant schema (greenfield Supabase project)
-- Run this on a fresh project. Replaces single-tenant 001_initial.sql.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- PLANS
-- =============================================================================
CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly_dzd INT,
  price_annual_dzd INT,
  client_limit INT,
  worker_limit INT,
  campaign_limit INT,
  scans_per_day_limit INT,
  location_limit INT,
  trial_days INT DEFAULT 0,
  features_json JSONB NOT NULL DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO plans (id, name, price_monthly_dzd, price_annual_dzd, client_limit, worker_limit, campaign_limit, scans_per_day_limit, trial_days, features_json, sort_order) VALUES
  ('trial', 'Essai gratuit', 0, 0, 250, 3, 3, NULL, 14,
   '{"whatsapp":false,"api_access":false,"card_design":"standard","ai_card_builder":false,"card_templates":false,"exclusive_templates":false,"custom_card_bg":false,"campaigns":true}'::jsonb, 0),
  ('boutique', 'Boutique', 2900, 29000, 250, 3, 3, NULL, 14,
   '{"whatsapp":false,"api_access":false,"card_design":"standard","ai_card_builder":false,"card_templates":false,"exclusive_templates":false,"custom_card_bg":false,"campaigns":true}'::jsonb, 1),
  ('maison', 'Maison', 5400, 54000, 2000, 15, NULL, NULL, 14,
   '{"whatsapp":true,"api_access":false,"card_design":"ai_builder","ai_card_builder":true,"card_templates":true,"exclusive_templates":false,"custom_card_bg":true,"campaigns":true}'::jsonb, 2),
  ('prestige', 'Prestige', NULL, NULL, NULL, NULL, NULL, NULL, 0,
   '{"whatsapp":true,"api_access":true,"card_design":"ai_premium","ai_card_builder":true,"card_templates":true,"exclusive_templates":true,"custom_card_bg":true,"campaigns":true}'::jsonb, 3);

-- =============================================================================
-- TENANTS
-- =============================================================================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  logo_url TEXT,
  brand_color TEXT NOT NULL DEFAULT '#1A56DB',
  plan_id TEXT NOT NULL REFERENCES plans(id) DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  subscription_status TEXT NOT NULL DEFAULT 'trialing'
    CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'expired')),
  subscription_ends_at TIMESTAMPTZ,
  chargily_customer_id TEXT,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  dashboard_tutorial_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_plan ON tenants(plan_id);

-- =============================================================================
-- SUBSCRIPTIONS & PAYMENTS
-- =============================================================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'annual')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'canceled', 'failed')),
  amount_dzd INT NOT NULL,
  chargily_checkout_id TEXT,
  chargily_payment_id TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);

CREATE TABLE payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'annual')),
  amount_dzd INT NOT NULL,
  receipt_url TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'baridimob'
    CHECK (payment_method IN ('baridimob', 'ccp', 'cib', 'cash')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_receipts_tenant ON payment_receipts(tenant_id);
CREATE INDEX idx_payment_receipts_status ON payment_receipts(status);

CREATE TABLE platform_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  bank_details TEXT NOT NULL DEFAULT 'Virement CCP / CIB — contactez support@mycarta.dz pour les coordonnées bancaires.',
  support_email TEXT DEFAULT 'support@mycarta.dz',
  maintenance_enabled BOOLEAN NOT NULL DEFAULT false,
  maintenance_banner TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO platform_settings (id, bank_details) VALUES ('default', 'Virement CCP / CIB — contactez support@mycarta.dz pour les coordonnées bancaires.');

-- =============================================================================
-- SHOP SETTINGS (one row per tenant)
-- =============================================================================
CREATE TABLE shop_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL DEFAULT 'Mon commerce',
  logo_url TEXT,
  card_template_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#1A56DB',
  secondary_color TEXT NOT NULL DEFAULT '#0E9F6E',
  currency TEXT NOT NULL DEFAULT 'DZD',
  timezone TEXT NOT NULL DEFAULT 'Africa/Algiers',
  stamp_threshold INT NOT NULL DEFAULT 9,
  max_scans_per_day INT NOT NULL DEFAULT 2,
  reward_type TEXT NOT NULL DEFAULT 'free_product',
  reward_value TEXT DEFAULT '',
  stamp_milestones JSONB NOT NULL DEFAULT '[]',
  client_language TEXT NOT NULL DEFAULT 'fr' CHECK (client_language IN ('fr', 'en')),
  card_design_id TEXT NOT NULL DEFAULT 'classic',
  track_products BOOLEAN NOT NULL DEFAULT true,
  whatsapp_token TEXT,
  whatsapp_phone_id TEXT,
  email_sender TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shop_settings_tenant ON shop_settings(tenant_id);

-- =============================================================================
-- PROFILES
-- =============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'worker', 'super_admin')),
  worker_qr_token UUID UNIQUE DEFAULT gen_random_uuid(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_worker_qr ON profiles(worker_qr_token);

-- =============================================================================
-- CLIENTS
-- =============================================================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  password_hash TEXT,
  fidelity_qr_token UUID NOT NULL DEFAULT gen_random_uuid(),
  card_code CHAR(6),
  card_url TEXT,
  total_stamps INT NOT NULL DEFAULT 0,
  current_cycle_stamps INT NOT NULL DEFAULT 0,
  total_rewards_earned INT NOT NULL DEFAULT 0,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_scan_at TIMESTAMPTZ,
  notes TEXT,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  device_fingerprint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, card_code),
  UNIQUE (tenant_id, fidelity_qr_token)
);

CREATE INDEX idx_clients_tenant ON clients(tenant_id);
CREATE INDEX idx_clients_card_code ON clients(tenant_id, card_code);
CREATE INDEX idx_clients_phone ON clients(tenant_id, phone);
CREATE INDEX idx_clients_search ON clients(tenant_id, full_name, phone, email);

-- Auto-generate 6-digit card_code per tenant
CREATE OR REPLACE FUNCTION generate_client_card_code(p_tenant_id UUID)
RETURNS CHAR(6)
LANGUAGE plpgsql
AS $$
DECLARE
  new_code CHAR(6);
  attempts INT := 0;
BEGIN
  LOOP
    new_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM clients WHERE tenant_id = p_tenant_id AND card_code = new_code
    );
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Could not generate unique card code';
    END IF;
  END LOOP;
  RETURN new_code;
END;
$$;

CREATE OR REPLACE FUNCTION clients_set_card_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.card_code IS NULL OR NEW.card_code = '' THEN
    NEW.card_code := generate_client_card_code(NEW.tenant_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_card_code BEFORE INSERT ON clients
  FOR EACH ROW EXECUTE FUNCTION clients_set_card_code();

-- =============================================================================
-- PRODUCTS, SCANS, REWARDS, CAMPAIGNS
-- =============================================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_tenant ON products(tenant_id);

CREATE TABLE scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  worker_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  scan_type TEXT NOT NULL DEFAULT 'purchase' CHECK (scan_type IN ('enrolment', 'purchase')),
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'blocked_fraud', 'blocked_limit')),
  block_reason TEXT,
  stamps_added INT NOT NULL DEFAULT 0,
  reward_triggered BOOLEAN NOT NULL DEFAULT false,
  pending_products BOOLEAN NOT NULL DEFAULT false,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scan_logs_tenant ON scan_logs(tenant_id);
CREATE INDEX idx_scan_logs_client ON scan_logs(tenant_id, client_id, scanned_at);
CREATE INDEX idx_scan_logs_worker ON scan_logs(tenant_id, worker_id, scanned_at);
CREATE INDEX idx_scan_logs_status ON scan_logs(tenant_id, status);

CREATE TABLE scan_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  scan_log_id UUID NOT NULL REFERENCES scan_logs(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1
);

CREATE INDEX idx_scan_products_tenant ON scan_products(tenant_id);

CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  scan_log_id UUID REFERENCES scan_logs(id) ON DELETE SET NULL,
  reward_description TEXT NOT NULL,
  redeemed_at TIMESTAMPTZ,
  redeemed_by_worker_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rewards_tenant ON rewards(tenant_id);
CREATE INDEX idx_rewards_client ON rewards(tenant_id, client_id);

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  subject TEXT,
  body TEXT NOT NULL,
  recipient_filter JSONB DEFAULT '{"all": true}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INT DEFAULT 0,
  total_sent INT DEFAULT 0,
  total_failed INT DEFAULT 0,
  total_opened INT DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_tenant ON campaigns(tenant_id);

-- =============================================================================
-- HELPERS
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_updated BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER shop_settings_updated BEFORE UPDATE ON shop_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER clients_updated BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER campaigns_updated BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER subscriptions_updated BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_owner()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'owner' AND is_active = true
      AND tenant_id IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_worker()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'worker' AND is_active = true
      AND tenant_id IS NOT NULL
  );
$$;

-- Legacy aliases
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_tenant_owner() OR is_super_admin();
$$;

CREATE OR REPLACE FUNCTION public.is_worker()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_tenant_worker();
$$;

CREATE OR REPLACE FUNCTION public.products_set_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := get_my_tenant_id();
  END IF;

  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id is required';
  END IF;

  IF NOT is_super_admin() AND NEW.tenant_id IS DISTINCT FROM get_my_tenant_id() THEN
    RAISE EXCEPTION 'Cannot create product for another tenant';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER products_set_tenant
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION products_set_tenant_id();

CREATE OR REPLACE FUNCTION public.is_owner_setup_complete()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE role = 'owner');
$$;

-- =============================================================================
-- PLAN LIMITS
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_tenant_plan(p_tenant_id UUID)
RETURNS TABLE (
  plan_id TEXT,
  client_limit INT,
  worker_limit INT,
  campaign_limit INT,
  scans_per_day_limit INT,
  location_limit INT,
  features_json JSONB,
  subscription_status TEXT,
  trial_ends_at TIMESTAMPTZ,
  is_access_allowed BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant tenants%ROWTYPE;
  v_plan plans%ROWTYPE;
  v_allowed BOOLEAN;
BEGIN
  SELECT * INTO v_tenant FROM tenants WHERE id = p_tenant_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT * INTO v_plan FROM plans WHERE id = v_tenant.plan_id;

  v_allowed := v_tenant.subscription_status IN ('trialing', 'active');
  IF v_tenant.subscription_status = 'trialing' AND v_tenant.trial_ends_at IS NOT NULL THEN
    v_allowed := v_allowed AND v_tenant.trial_ends_at > now();
  END IF;
  IF v_tenant.subscription_status = 'active' AND v_tenant.subscription_ends_at IS NOT NULL THEN
    v_allowed := v_allowed AND v_tenant.subscription_ends_at > now();
  END IF;

  plan_id := v_tenant.plan_id;
  client_limit := v_plan.client_limit;
  worker_limit := v_plan.worker_limit;
  campaign_limit := v_plan.campaign_limit;
  scans_per_day_limit := v_plan.scans_per_day_limit;
  features_json := v_plan.features_json;
  subscription_status := v_tenant.subscription_status;
  trial_ends_at := v_tenant.trial_ends_at;
  is_access_allowed := v_allowed;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_plan_limits(p_tenant_id UUID, p_check TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plan RECORD;
  v_count INT;
  v_today_scans INT;
BEGIN
  SELECT * INTO v_plan FROM get_tenant_plan(p_tenant_id);
  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'tenant_not_found');
  END IF;

  IF NOT v_plan.is_access_allowed THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'subscription_expired', 'upgrade_required', true);
  END IF;

  IF p_check = 'enrol_client' AND v_plan.client_limit IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM clients WHERE tenant_id = p_tenant_id;
    IF v_count >= v_plan.client_limit THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'client_limit', 'limit', v_plan.client_limit, 'upgrade_required', true);
    END IF;
  END IF;

  IF p_check = 'add_worker' AND v_plan.worker_limit IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM profiles WHERE tenant_id = p_tenant_id AND role = 'worker' AND is_active = true;
    IF v_count >= v_plan.worker_limit THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'worker_limit', 'limit', v_plan.worker_limit, 'upgrade_required', true);
    END IF;
  END IF;

  IF p_check = 'tenant_scans_today' AND v_plan.scans_per_day_limit IS NOT NULL THEN
    SELECT count(*) INTO v_today_scans FROM scan_logs
    WHERE tenant_id = p_tenant_id AND status = 'approved' AND stamps_added > 0
      AND scanned_at >= date_trunc('day', now());
    IF v_today_scans >= v_plan.scans_per_day_limit THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'tenant_scan_limit', 'limit', v_plan.scans_per_day_limit, 'upgrade_required', true);
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_tenant_by_slug(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant tenants%ROWTYPE;
  v_settings shop_settings%ROWTYPE;
BEGIN
  SELECT * INTO v_tenant FROM tenants WHERE slug = lower(trim(p_slug));
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_settings FROM shop_settings WHERE tenant_id = v_tenant.id;

  RETURN jsonb_build_object(
    'id', v_tenant.id,
    'slug', v_tenant.slug,
    'name', v_tenant.name,
    'logoUrl', v_tenant.logo_url,
    'brandColor', v_tenant.brand_color,
    'businessName', COALESCE(v_settings.business_name, v_tenant.name),
    'primaryColor', COALESCE(v_settings.primary_color, v_tenant.brand_color),
    'secondaryColor', COALESCE(v_settings.secondary_color, '#0E9F6E'),
    'clientLanguage', COALESCE(v_settings.client_language, 'fr')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_trial_status(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant tenants%ROWTYPE;
  v_plan plans%ROWTYPE;
  v_days_left INT;
BEGIN
  SELECT * INTO v_tenant FROM tenants WHERE id = p_tenant_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO v_plan FROM plans WHERE id = v_tenant.plan_id;

  v_days_left := CASE
    WHEN v_tenant.trial_ends_at IS NOT NULL THEN GREATEST(0, EXTRACT(day FROM v_tenant.trial_ends_at - now())::int)
    ELSE 0
  END;

  RETURN jsonb_build_object(
    'planId', v_tenant.plan_id,
    'planName', v_plan.name,
    'subscriptionStatus', v_tenant.subscription_status,
    'trialEndsAt', v_tenant.trial_ends_at,
    'subscriptionEndsAt', v_tenant.subscription_ends_at,
    'daysLeft', v_days_left,
    'isActive', (SELECT is_access_allowed FROM get_tenant_plan(p_tenant_id))
  );
END;
$$;

-- =============================================================================
-- CLIENT CARD RPCs (tenant-scoped via card_code or fidelity token)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_client_card_by_token(p_token TEXT, p_tenant_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_client clients%ROWTYPE;
  v_settings shop_settings%ROWTYPE;
  v_lookup TEXT;
  v_rewards JSONB;
  v_scans JSONB;
  v_pending RECORD;
BEGIN
  v_lookup := lpad(trim(p_token), 6, '0');

  IF p_tenant_id IS NOT NULL THEN
    SELECT * INTO v_client FROM clients
    WHERE tenant_id = p_tenant_id AND (card_code = v_lookup OR fidelity_qr_token::text = trim(p_token))
    LIMIT 1;
  ELSE
    SELECT * INTO v_client FROM clients
    WHERE card_code = v_lookup OR fidelity_qr_token::text = trim(p_token)
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_settings FROM shop_settings WHERE tenant_id = v_client.tenant_id;

  SELECT jsonb_agg(jsonb_build_object(
    'id', r.id, 'rewardDescription', r.reward_description,
    'createdAt', r.created_at, 'redeemedAt', r.redeemed_at
  ) ORDER BY r.created_at DESC)
  INTO v_rewards
  FROM rewards r WHERE r.client_id = v_client.id LIMIT 20;

  SELECT jsonb_agg(jsonb_build_object(
    'scannedAt', s.scanned_at, 'status', s.status, 'stampsAdded', s.stamps_added
  ) ORDER BY s.scanned_at DESC)
  INTO v_scans
  FROM scan_logs s WHERE s.client_id = v_client.id LIMIT 10;

  SELECT r.id, r.reward_description INTO v_pending
  FROM rewards r
  WHERE r.client_id = v_client.id AND r.redeemed_at IS NULL
  ORDER BY r.created_at DESC LIMIT 1;

  RETURN jsonb_build_object(
    'businessName', COALESCE(v_settings.business_name, 'mycarta'),
    'clientName', v_client.full_name,
    'primaryColor', COALESCE(v_settings.primary_color, '#1A56DB'),
    'secondaryColor', COALESCE(v_settings.secondary_color, '#0E9F6E'),
    'cardUrl', v_client.card_url,
    'cardTemplateUrl', v_settings.card_template_url,
    'stampThreshold', COALESCE(v_settings.stamp_threshold, 9),
    'currentCycleStamps', v_client.current_cycle_stamps,
    'cardCode', v_client.card_code,
    'stampMilestones', COALESCE(v_settings.stamp_milestones, '[]'::jsonb),
    'pendingRewardId', v_pending.id,
    'pendingRewardDescription', v_pending.reward_description,
    'rewards', COALESCE(v_rewards, '[]'::jsonb),
    'recentScans', COALESCE(v_scans, '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_client_rewards_by_token(p_token TEXT, p_tenant_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_client_id UUID;
  v_lookup TEXT;
BEGIN
  v_lookup := lpad(trim(p_token), 6, '0');

  IF p_tenant_id IS NOT NULL THEN
    SELECT id INTO v_client_id FROM clients
    WHERE tenant_id = p_tenant_id AND (card_code = v_lookup OR fidelity_qr_token::text = trim(p_token))
    LIMIT 1;
  ELSE
    SELECT id INTO v_client_id FROM clients
    WHERE card_code = v_lookup OR fidelity_qr_token::text = trim(p_token)
    LIMIT 1;
  END IF;

  IF v_client_id IS NULL THEN RETURN '[]'::jsonb; END IF;

  RETURN (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', r.id, 'rewardDescription', r.reward_description,
      'createdAt', r.created_at, 'redeemedAt', r.redeemed_at
    ) ORDER BY r.created_at DESC), '[]'::jsonb)
    FROM rewards r WHERE r.client_id = v_client_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_reward_claim_by_id(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_reward rewards%ROWTYPE;
  v_client clients%ROWTYPE;
  v_settings shop_settings%ROWTYPE;
BEGIN
  SELECT * INTO v_reward FROM rewards WHERE id = p_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_client FROM clients WHERE id = v_reward.client_id;
  SELECT * INTO v_settings FROM shop_settings WHERE tenant_id = v_client.tenant_id;

  RETURN jsonb_build_object(
    'rewardId', v_reward.id,
    'rewardDescription', v_reward.reward_description,
    'clientName', v_client.full_name,
    'businessName', COALESCE(v_settings.business_name, 'mycarta'),
    'primaryColor', COALESCE(v_settings.primary_color, '#1A56DB'),
    'redeemedAt', v_reward.redeemed_at
  );
END;
$$;

-- Fix get_reward_claim_by_token - rewards don't have fidelity_qr_token
CREATE OR REPLACE FUNCTION public.get_reward_claim_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_reward rewards%ROWTYPE;
  v_client clients%ROWTYPE;
  v_settings shop_settings%ROWTYPE;
BEGIN
  BEGIN
    SELECT * INTO v_reward FROM rewards WHERE id = trim(p_token)::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_reward := NULL;
  END;

  IF v_reward IS NULL THEN
    SELECT r.* INTO v_reward FROM rewards r
    JOIN clients c ON c.id = r.client_id
    WHERE c.card_code = lpad(trim(p_token), 6, '0') AND r.redeemed_at IS NULL
    ORDER BY r.created_at DESC LIMIT 1;
  END IF;

  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_client FROM clients WHERE id = v_reward.client_id;
  SELECT * INTO v_settings FROM shop_settings WHERE tenant_id = v_client.tenant_id;

  RETURN jsonb_build_object(
    'rewardId', v_reward.id,
    'rewardDescription', v_reward.reward_description,
    'clientName', v_client.full_name,
    'businessName', COALESCE(v_settings.business_name, 'mycarta'),
    'primaryColor', COALESCE(v_settings.primary_color, '#1A56DB'),
    'redeemedAt', v_reward.redeemed_at
  );
END;
$$;

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY plans_public_read ON plans FOR SELECT USING (true);

CREATE POLICY tenants_select ON tenants FOR SELECT USING (
  is_super_admin() OR id = get_my_tenant_id()
);
CREATE POLICY tenants_public_slug ON tenants FOR SELECT USING (true);
CREATE POLICY tenants_update_owner ON tenants FOR UPDATE USING (
  is_super_admin() OR (is_tenant_owner() AND id = get_my_tenant_id())
);
CREATE POLICY tenants_insert_super ON tenants FOR INSERT WITH CHECK (is_super_admin());

CREATE POLICY subscriptions_select ON subscriptions FOR SELECT USING (
  is_super_admin() OR tenant_id = get_my_tenant_id()
);
CREATE POLICY subscriptions_insert ON subscriptions FOR INSERT WITH CHECK (
  is_super_admin() OR tenant_id = get_my_tenant_id()
);

CREATE POLICY receipts_select ON payment_receipts FOR SELECT USING (
  is_super_admin() OR tenant_id = get_my_tenant_id()
);
CREATE POLICY receipts_insert ON payment_receipts FOR INSERT WITH CHECK (
  tenant_id = get_my_tenant_id() AND is_tenant_owner()
);
CREATE POLICY receipts_update_super ON payment_receipts FOR UPDATE USING (is_super_admin());

CREATE POLICY platform_settings_read ON platform_settings FOR SELECT USING (true);
CREATE POLICY platform_settings_super ON platform_settings FOR ALL USING (is_super_admin());

CREATE POLICY shop_settings_select ON shop_settings FOR SELECT USING (true);
CREATE POLICY shop_settings_update ON shop_settings FOR UPDATE USING (
  is_super_admin() OR (is_tenant_owner() AND tenant_id = get_my_tenant_id())
);
CREATE POLICY shop_settings_insert ON shop_settings FOR INSERT WITH CHECK (
  is_super_admin() OR is_tenant_owner()
);

CREATE POLICY profiles_select ON profiles FOR SELECT USING (
  is_super_admin()
  OR tenant_id = get_my_tenant_id()
  OR id = auth.uid()
);
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (
  is_super_admin() OR (is_tenant_owner() AND tenant_id = get_my_tenant_id())
);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (
  is_super_admin() OR is_tenant_owner() OR id = auth.uid()
);
CREATE POLICY profiles_delete ON profiles FOR DELETE USING (
  is_super_admin() OR (is_tenant_owner() AND tenant_id = get_my_tenant_id())
);

CREATE POLICY clients_select ON clients FOR SELECT USING (
  is_super_admin() OR (tenant_id = get_my_tenant_id() AND (is_tenant_owner() OR is_tenant_worker()))
);
CREATE POLICY clients_insert ON clients FOR INSERT WITH CHECK (true);
CREATE POLICY clients_update ON clients FOR UPDATE USING (
  is_super_admin() OR is_tenant_owner()
);
CREATE POLICY clients_delete ON clients FOR DELETE USING (
  is_super_admin() OR is_tenant_owner()
);

CREATE POLICY products_all ON products FOR ALL USING (
  is_super_admin() OR tenant_id = get_my_tenant_id()
) WITH CHECK (
  is_super_admin() OR (is_tenant_owner() AND tenant_id = get_my_tenant_id())
);

CREATE POLICY scan_logs_select ON scan_logs FOR SELECT USING (
  is_super_admin() OR is_tenant_owner() OR (is_tenant_worker() AND worker_id = auth.uid())
);
CREATE POLICY scan_logs_insert ON scan_logs FOR INSERT WITH CHECK (
  is_super_admin() OR is_tenant_owner() OR is_tenant_worker()
);

CREATE POLICY scan_products_select ON scan_products FOR SELECT USING (
  is_super_admin() OR is_tenant_owner()
);
CREATE POLICY scan_products_insert ON scan_products FOR INSERT WITH CHECK (
  is_super_admin() OR is_tenant_owner() OR is_tenant_worker()
);

CREATE POLICY rewards_select ON rewards FOR SELECT USING (
  is_super_admin() OR is_tenant_owner() OR is_tenant_worker()
);
CREATE POLICY rewards_update ON rewards FOR UPDATE USING (
  is_super_admin() OR is_tenant_owner() OR is_tenant_worker()
);

CREATE POLICY campaigns_all ON campaigns FOR ALL USING (
  is_super_admin() OR (is_tenant_owner() AND tenant_id = get_my_tenant_id())
) WITH CHECK (
  is_super_admin() OR (is_tenant_owner() AND tenant_id = get_my_tenant_id())
);

-- Storage: tenant-assets bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('tenant-assets', 'tenant-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY tenant_assets_public_read ON storage.objects FOR SELECT USING (bucket_id = 'tenant-assets');
CREATE POLICY tenant_assets_owner_upload ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'tenant-assets' AND (is_tenant_owner() OR is_super_admin())
);
CREATE POLICY tenant_assets_owner_update ON storage.objects FOR UPDATE USING (
  bucket_id = 'tenant-assets' AND (is_tenant_owner() OR is_super_admin())
);

-- Receipt uploads (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY receipts_storage_insert ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'payment-receipts' AND is_tenant_owner()
);
CREATE POLICY receipts_storage_select ON storage.objects FOR SELECT USING (
  bucket_id = 'payment-receipts' AND (is_tenant_owner() OR is_super_admin())
);


-- INCREMENTAL MIGRATIONS

-- Fraud review index (from 002_fraud_review.sql)
CREATE INDEX IF NOT EXISTS idx_scan_logs_fraud ON scan_logs(status, reviewed_at)
  WHERE status IN ('blocked_fraud', 'blocked_limit');

-- from supabase/migrations/003_shop_settings_realtime.sql
-- Enable realtime sync for shop_settings (dashboard â†” DB)
ALTER PUBLICATION supabase_realtime ADD TABLE shop_settings;


-- from supabase/migrations/005_client_password.sql
-- Client phone + password auth (signup / login on /client)
-- Safe to re-run: dedupes phones, then adds column + unique index.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Normalize phone formatting (remove spaces)
UPDATE clients
SET phone = regexp_replace(trim(phone), '\s+', '', 'g')
WHERE phone IS NOT NULL;

-- Duplicate phones block the unique index â€” keep oldest enrolment per phone, clear others
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY phone
      ORDER BY enrolled_at ASC, created_at ASC
    ) AS rn
  FROM clients
  WHERE phone IS NOT NULL AND phone <> ''
)
UPDATE clients AS c
SET phone = NULL
FROM ranked AS r
WHERE c.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_phone_unique
  ON clients (phone)
  WHERE phone IS NOT NULL AND phone <> '';


-- from supabase/migrations/002_platform_admin.sql
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


-- from supabase/migrations/004_platform_analytics_complete.sql
-- Platform admin â€” extended KPIs & analytics (run after 002_platform_admin.sql)
-- Powers richer /platform console: revenue, cards, workers, fraud, cohorts

-- ---------------------------------------------------------------------------
-- Indexes (safe if already exist â€” use IF NOT EXISTS)
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
-- Overview â€” replaces get_platform_overview with extended KPIs
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
-- Tenant list â€” extended row metrics
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
-- Tenant detail â€” extended
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


-- from supabase/migrations/005_platform_admin_complete.sql
-- Platform admin complete â€” audit log, alerts, extended settings (run after 004)

-- ---------------------------------------------------------------------------
-- Extended platform_settings
-- ---------------------------------------------------------------------------
ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS support_email TEXT DEFAULT 'support@mycarta.dz',
  ADD COLUMN IF NOT EXISTS maintenance_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_banner TEXT DEFAULT '';

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_created ON platform_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_tenant ON platform_audit_log(target_tenant_id);

ALTER TABLE platform_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_audit_super_admin ON platform_audit_log;
CREATE POLICY platform_audit_super_admin ON platform_audit_log
  FOR SELECT TO authenticated
  USING (is_super_admin());

-- ---------------------------------------------------------------------------
-- Helper: log platform action
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_platform_action(
  p_action TEXT,
  p_target_tenant_id UUID DEFAULT NULL,
  p_meta JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO platform_audit_log (actor_id, action, target_tenant_id, meta)
  VALUES (auth.uid(), p_action, p_target_tenant_id, COALESCE(p_meta, '{}'::jsonb));
END;
$$;

-- ---------------------------------------------------------------------------
-- Alerts dashboard
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_platform_alerts()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN jsonb_build_object(
    'trialExpiring3d', (
      SELECT count(*)::int FROM tenants
      WHERE subscription_status = 'trialing'
        AND trial_ends_at IS NOT NULL
        AND trial_ends_at <= now() + interval '3 days'
        AND trial_ends_at > now()
    ),
    'trialExpiring7d', (
      SELECT count(*)::int FROM tenants
      WHERE subscription_status = 'trialing'
        AND trial_ends_at IS NOT NULL
        AND trial_ends_at <= now() + interval '7 days'
        AND trial_ends_at > now()
    ),
    'pendingReceiptsOver48h', (
      SELECT count(*)::int FROM payment_receipts
      WHERE status = 'pending' AND created_at < now() - interval '48 hours'
    ),
    'inactiveTenants14d', (
      SELECT count(*)::int FROM tenants t
      WHERE NOT EXISTS (
        SELECT 1 FROM scan_logs s
        WHERE s.tenant_id = t.id AND s.scanned_at >= now() - interval '14 days'
      )
      AND t.subscription_status IN ('trialing', 'active')
    ),
    'items', (
      SELECT COALESCE(jsonb_agg(item ORDER BY (item->>'priority')::int), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'type', 'trial_expiring',
          'priority', 1,
          'tenantId', t.id,
          'tenantName', t.name,
          'tenantSlug', t.slug,
          'message', 'Essai expire le ' || to_char(t.trial_ends_at, 'DD/MM/YYYY'),
          'trialEndsAt', t.trial_ends_at
        ) AS item
        FROM tenants t
        WHERE t.subscription_status = 'trialing'
          AND t.trial_ends_at IS NOT NULL
          AND t.trial_ends_at <= now() + interval '7 days'
          AND t.trial_ends_at > now()
        UNION ALL
        SELECT jsonb_build_object(
          'type', 'receipt_pending',
          'priority', 2,
          'receiptId', r.id,
          'tenantId', r.tenant_id,
          'tenantName', tn.name,
          'message', 'ReÃ§u en attente depuis ' || round(extract(epoch FROM now() - r.created_at) / 3600)::int || 'h',
          'amountDzd', r.amount_dzd,
          'createdAt', r.created_at
        )
        FROM payment_receipts r
        JOIN tenants tn ON tn.id = r.tenant_id
        WHERE r.status = 'pending' AND r.created_at < now() - interval '48 hours'
        UNION ALL
        SELECT jsonb_build_object(
          'type', 'inactive_tenant',
          'priority', 3,
          'tenantId', t.id,
          'tenantName', t.name,
          'tenantSlug', t.slug,
          'message', 'Aucun scan depuis 14+ jours',
          'daysSinceLastScan', (
            SELECT CASE WHEN max(s.scanned_at) IS NULL THEN NULL
              ELSE extract(day FROM now() - max(s.scanned_at))::int END
            FROM scan_logs s WHERE s.tenant_id = t.id
          )
        )
        FROM tenants t
        WHERE t.subscription_status IN ('trialing', 'active')
          AND NOT EXISTS (
            SELECT 1 FROM scan_logs s
            WHERE s.tenant_id = t.id AND s.scanned_at >= now() - interval '14 days'
          )
      ) alerts
    )
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Audit log list
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_platform_audit_log(p_limit INT DEFAULT 50)
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
        l.id,
        l.action,
        l.meta,
        l.created_at AS "createdAt",
        l.target_tenant_id AS "targetTenantId",
        t.name AS "targetTenantName",
        p.full_name AS "actorName",
        p.email AS "actorEmail"
      FROM platform_audit_log l
      LEFT JOIN tenants t ON t.id = l.target_tenant_id
      LEFT JOIN profiles p ON p.id = l.actor_id
      ORDER BY l.created_at DESC
      LIMIT LEAST(p_limit, 200)
    ) x
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Patch overview with P4 metrics
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_platform_overview()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_base JSONB;
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

  v_base :=
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

  RETURN v_base;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_audit_log(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_platform_action(TEXT, UUID, JSONB) TO authenticated;


-- from supabase/migrations/006_platform_overview_fix.sql
-- Fix get_platform_overview: jsonb_build_object is limited to 100 arguments (50 pairs).
-- The overview payload has 59 pairs â€” split into two objects merged with ||.

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


-- from supabase/migrations/013_card_design_rpc_fix.sql
-- Fix get_client_card_by_token: tenant-scoped signature (matches app) + cardDesignId.

ALTER TABLE shop_settings
  ADD COLUMN IF NOT EXISTS card_design_id TEXT NOT NULL DEFAULT 'classic';

-- Remove single-arg overload from 012 if present (app always passes p_tenant_id).
DROP FUNCTION IF EXISTS public.get_client_card_by_token(TEXT);

CREATE OR REPLACE FUNCTION public.get_client_card_by_token(p_token TEXT, p_tenant_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client clients%ROWTYPE;
  v_settings shop_settings%ROWTYPE;
  v_pending_reward rewards%ROWTYPE;
  v_recent_scans JSONB;
  v_rewards JSONB;
  v_lookup TEXT;
BEGIN
  v_lookup := lpad(trim(p_token), 6, '0');

  IF p_tenant_id IS NOT NULL THEN
    SELECT * INTO v_client
    FROM clients
    WHERE tenant_id = p_tenant_id
      AND (card_code = v_lookup OR fidelity_qr_token::text = trim(p_token))
      AND NOT is_blocked
    LIMIT 1;
  ELSE
    SELECT * INTO v_client
    FROM clients
    WHERE (card_code = v_lookup OR fidelity_qr_token::text = trim(p_token))
      AND NOT is_blocked
    LIMIT 1;
  END IF;

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
    jsonb_agg(
      jsonb_build_object(
        'scannedAt', sl.scanned_at,
        'status', sl.status,
        'stampsAdded', sl.stamps_added
      )
      ORDER BY sl.scanned_at DESC
    ),
    '[]'::jsonb
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
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'rewardDescription', r.reward_description,
        'createdAt', r.created_at,
        'redeemedAt', r.redeemed_at
      )
      ORDER BY r.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_rewards
  FROM rewards r
  WHERE r.client_id = v_client.id;

  RETURN jsonb_build_object(
    'businessName', COALESCE(v_settings.business_name, 'mycarta'),
    'clientName', v_client.full_name,
    'primaryColor', COALESCE(v_settings.primary_color, '#1A56DB'),
    'secondaryColor', COALESCE(v_settings.secondary_color, '#0E9F6E'),
    'cardUrl', v_client.card_url,
    'cardTemplateUrl', v_settings.card_template_url,
    'cardDesignId', COALESCE(v_settings.card_design_id, 'classic'),
    'stampThreshold', COALESCE(v_settings.stamp_threshold, 9),
    'currentCycleStamps', v_client.current_cycle_stamps,
    'cardCode', v_client.card_code,
    'stampMilestones', COALESCE(v_settings.stamp_milestones, '[]'::jsonb),
    'pendingRewardId', v_pending_reward.id,
    'pendingRewardDescription', v_pending_reward.reward_description,
    'rewards', COALESCE(v_rewards, '[]'::jsonb),
    'recentScans', COALESCE(v_recent_scans, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_card_by_token(TEXT, UUID) TO anon, authenticated;


-- from supabase/migrations/014_official_pricing_plans.sql
-- LoyalQR official pricing grid â€” June 2026 (DZD)

ALTER TABLE plans ADD COLUMN IF NOT EXISTS location_limit INT;

UPDATE plans SET
  name = 'Essai gratuit',
  price_monthly_dzd = 0,
  price_annual_dzd = 0,
  client_limit = 250,
  worker_limit = 3,
  campaign_limit = 3,
  location_limit = 1,
  scans_per_day_limit = NULL,
  trial_days = 14,
  features_json = '{
    "whatsapp": false,
    "api_access": false,
    "card_design": "standard",
    "ai_card_builder": false,
    "card_templates": false,
    "exclusive_templates": false,
    "custom_card_bg": false,
    "campaigns": true
  }'::jsonb,
  sort_order = 0
WHERE id = 'trial';

UPDATE plans SET
  name = 'Boutique',
  price_monthly_dzd = 2900,
  price_annual_dzd = 29000,
  client_limit = 250,
  worker_limit = 3,
  campaign_limit = 3,
  location_limit = 1,
  scans_per_day_limit = NULL,
  trial_days = 14,
  features_json = '{
    "whatsapp": false,
    "api_access": false,
    "card_design": "standard",
    "ai_card_builder": false,
    "card_templates": false,
    "exclusive_templates": false,
    "custom_card_bg": false,
    "campaigns": true
  }'::jsonb,
  sort_order = 1
WHERE id = 'boutique';

UPDATE plans SET
  name = 'Maison',
  price_monthly_dzd = 5400,
  price_annual_dzd = 54000,
  client_limit = 2000,
  worker_limit = 15,
  campaign_limit = NULL,
  location_limit = 3,
  scans_per_day_limit = NULL,
  trial_days = 14,
  features_json = '{
    "whatsapp": true,
    "api_access": false,
    "card_design": "ai_builder",
    "ai_card_builder": true,
    "card_templates": true,
    "exclusive_templates": false,
    "custom_card_bg": true,
    "campaigns": true
  }'::jsonb,
  sort_order = 2
WHERE id = 'maison';

UPDATE plans SET
  name = 'Prestige',
  price_monthly_dzd = NULL,
  price_annual_dzd = NULL,
  client_limit = NULL,
  worker_limit = NULL,
  campaign_limit = NULL,
  location_limit = NULL,
  scans_per_day_limit = NULL,
  trial_days = 0,
  features_json = '{
    "whatsapp": true,
    "api_access": true,
    "card_design": "ai_premium",
    "ai_card_builder": true,
    "card_templates": true,
    "exclusive_templates": true,
    "custom_card_bg": true,
    "campaigns": true
  }'::jsonb,
  sort_order = 3
WHERE id = 'prestige';

-- Extend plan limit checks (campaigns when table exists).
CREATE OR REPLACE FUNCTION public.check_plan_limits(p_tenant_id UUID, p_check TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plan RECORD;
  v_count INT;
  v_today_scans INT;
  v_campaigns_this_month INT;
BEGIN
  SELECT * INTO v_plan FROM get_tenant_plan(p_tenant_id);
  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'tenant_not_found');
  END IF;

  IF NOT v_plan.is_access_allowed THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'subscription_expired', 'upgrade_required', true);
  END IF;

  IF p_check = 'enrol_client' AND v_plan.client_limit IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM clients WHERE tenant_id = p_tenant_id;
    IF v_count >= v_plan.client_limit THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'client_limit', 'limit', v_plan.client_limit, 'upgrade_required', true);
    END IF;
  END IF;

  IF p_check = 'add_worker' AND v_plan.worker_limit IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM profiles WHERE tenant_id = p_tenant_id AND role = 'worker' AND is_active = true;
    IF v_count >= v_plan.worker_limit THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'worker_limit', 'limit', v_plan.worker_limit, 'upgrade_required', true);
    END IF;
  END IF;

  IF p_check = 'add_campaign' AND v_plan.campaign_limit IS NOT NULL THEN
    IF to_regclass('public.campaigns') IS NOT NULL THEN
      SELECT count(*) INTO v_campaigns_this_month
      FROM campaigns
      WHERE tenant_id = p_tenant_id
        AND created_at >= date_trunc('month', now());
      IF v_campaigns_this_month >= v_plan.campaign_limit THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'campaign_limit', 'limit', v_plan.campaign_limit, 'upgrade_required', true);
      END IF;
    END IF;
  END IF;

  IF p_check = 'tenant_scans_today' AND v_plan.scans_per_day_limit IS NOT NULL THEN
    SELECT count(*) INTO v_today_scans FROM scan_logs
    WHERE tenant_id = p_tenant_id AND status = 'approved' AND stamps_added > 0
      AND scanned_at >= date_trunc('day', now());
    IF v_today_scans >= v_plan.scans_per_day_limit THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'tenant_scan_limit', 'limit', v_plan.scans_per_day_limit, 'upgrade_required', true);
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Return plan limits in trial status for dashboard UI.
CREATE OR REPLACE FUNCTION public.get_trial_status(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant tenants%ROWTYPE;
  v_plan plans%ROWTYPE;
  v_days_left INT;
BEGIN
  SELECT * INTO v_tenant FROM tenants WHERE id = p_tenant_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO v_plan FROM plans WHERE id = v_tenant.plan_id;

  v_days_left := CASE
    WHEN v_tenant.trial_ends_at IS NOT NULL THEN GREATEST(0, EXTRACT(day FROM v_tenant.trial_ends_at - now())::int)
    ELSE 0
  END;

  RETURN jsonb_build_object(
    'planId', v_tenant.plan_id,
    'planName', v_plan.name,
    'subscriptionStatus', v_tenant.subscription_status,
    'trialEndsAt', v_tenant.trial_ends_at,
    'subscriptionEndsAt', v_tenant.subscription_ends_at,
    'daysLeft', v_days_left,
    'isActive', (SELECT is_access_allowed FROM get_tenant_plan(p_tenant_id)),
    'clientLimit', v_plan.client_limit,
    'workerLimit', v_plan.worker_limit,
    'campaignLimit', v_plan.campaign_limit,
    'locationLimit', v_plan.location_limit,
    'scansPerDayLimit', v_plan.scans_per_day_limit,
    'featuresJson', v_plan.features_json
  );
END;
$$;


-- from supabase/migrations/015_tenant_activities.sql
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


GRANT EXECUTE ON FUNCTION public.get_client_card_by_token(TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_rewards_by_token(TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_reward_claim_by_id(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_reward_claim_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner_setup_complete() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_by_slug(TEXT) TO anon, authenticated;

