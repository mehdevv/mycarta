-- mycarta SaaS — complete multi-tenant schema (greenfield Supabase project)
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

CREATE OR REPLACE FUNCTION public.is_owner_setup_complete()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM tenants LIMIT 1);
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
