// Cancel tenant subscription — JWT: ON (owner)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "owner" || !profile.tenant_id) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tenant } = await admin
      .from("tenants")
      .select("subscription_status, subscription_ends_at, plan_id")
      .eq("id", profile.tenant_id)
      .single();

    if (!tenant) return jsonResponse({ error: "Tenant not found" }, 404);

    if (tenant.subscription_status === "canceled") {
      return jsonResponse({ error: "Abonnement déjà annulé" }, 400);
    }

    if (tenant.subscription_status === "trialing" || tenant.plan_id === "trial") {
      return jsonResponse({ error: "Aucun abonnement payant à annuler" }, 400);
    }

    const now = new Date().toISOString();

    await admin
      .from("subscriptions")
      .update({ status: "canceled", updated_at: now })
      .eq("tenant_id", profile.tenant_id)
      .in("status", ["active", "pending"]);

    await admin
      .from("tenants")
      .update({
        subscription_status: "canceled",
        updated_at: now,
      })
      .eq("id", profile.tenant_id);

    return jsonResponse({
      success: true,
      accessUntil: tenant.subscription_ends_at,
    });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
