// Paste into Supabase Dashboard → Edge Functions → register-tenant — JWT: OFF
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

const RESERVED_SLUGS = new Set([
  "admin", "affiliate", "api", "app", "card", "client", "dashboard", "employee", "emloyee",
  "affiliate", "enrol", "login", "platform", "rep", "reward", "rewards", "setup", "shop", "signup",
  "tarifs", "worker", "www",
]);

function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { businessName, fullName, email, password, slug: rawSlug, phone, affiliateCode } = await req.json();

    if (!businessName || !fullName || !email || !password || !phone) {
      return jsonResponse({ error: "businessName, fullName, email, phone, and password are required" }, 400);
    }

    const normalizedPhone = String(phone).replace(/\D/g, "");
    if (normalizedPhone.length < 8) {
      return jsonResponse({ error: "Phone must be at least 8 digits" }, 400);
    }

    if (password.length < 8) {
      return jsonResponse({ error: "Password must be at least 8 characters" }, 400);
    }

    let slug = rawSlug ? slugify(rawSlug) : slugify(businessName);
    if (!slug) slug = `shop-${Date.now().toString(36)}`;

    if (isReservedSlug(slug)) {
      return jsonResponse({ error: "Ce nom d'URL est réservé. Choisissez un autre identifiant." }, 400);
    }

    const { data: existingSlug } = await admin.from("tenants").select("id").eq("slug", slug).maybeSingle();
    if (existingSlug) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    let referredAffiliateId: string | null = null;
    let affiliateCodeUsed: string | null = null;

    if (affiliateCode && String(affiliateCode).trim()) {
      const { data: affiliateInfo } = await admin.rpc("get_affiliate_by_code", {
        p_code: String(affiliateCode).trim(),
      });
      if (!affiliateInfo?.id) {
        return jsonResponse({ error: "Code partenaire invalide ou expiré" }, 400);
      }
      referredAffiliateId = affiliateInfo.id;
      affiliateCodeUsed = affiliateInfo.affiliateCode ?? String(affiliateCode).trim().toUpperCase();
    }

    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 14);

    const { data: tenant, error: tenantError } = await admin
      .from("tenants")
      .insert({
        slug,
        name: businessName.trim(),
        plan_id: "trial",
        trial_ends_at: trialEnds.toISOString(),
        subscription_status: "trialing",
        owner_phone: normalizedPhone,
        referred_affiliate_id: referredAffiliateId,
        affiliate_code_used: affiliateCodeUsed,
      })
      .select("id, slug")
      .single();

    if (tenantError) return jsonResponse({ error: tenantError.message }, 400);

    const { error: settingsError } = await admin.from("shop_settings").insert({
      tenant_id: tenant.id,
      business_name: businessName.trim(),
    });

    if (settingsError) {
      await admin.from("tenants").delete().eq("id", tenant.id);
      return jsonResponse({ error: settingsError.message }, 400);
    }

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    });

    if (authError) {
      await admin.from("tenants").delete().eq("id", tenant.id);
      return jsonResponse({ error: authError.message }, 400);
    }

    const { error: profileError } = await admin.from("profiles").insert({
      id: authUser.user.id,
      tenant_id: tenant.id,
      full_name: fullName.trim(),
      email: email.trim(),
      phone: normalizedPhone,
      role: "owner",
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      await admin.from("tenants").delete().eq("id", tenant.id);
      return jsonResponse({ error: profileError.message }, 400);
    }

    return jsonResponse({
      success: true,
      tenantId: tenant.id,
      slug: tenant.slug,
      trialEndsAt: trialEnds.toISOString(),
    });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
