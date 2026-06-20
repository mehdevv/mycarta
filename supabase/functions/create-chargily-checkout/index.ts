// Chargily Pay checkout — JWT: ON (owner)
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, tenant_id, email")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "owner" || !profile.tenant_id) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const { planId, billingPeriod } = await req.json();
    if (!planId || !billingPeriod) {
      return jsonResponse({ error: "planId and billingPeriod required" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: plan } = await admin.from("plans").select("*").eq("id", planId).single();
    if (!plan) return jsonResponse({ error: "Plan not found" }, 404);

    const amount =
      billingPeriod === "annual" ? plan.price_annual_dzd : plan.price_monthly_dzd;
    if (!amount) return jsonResponse({ error: "Plan not available for online checkout" }, 400);

    const { data: tenant } = await admin
      .from("tenants")
      .select("slug, name")
      .eq("id", profile.tenant_id)
      .single();

    const { data: sub, error: subError } = await admin
      .from("subscriptions")
      .insert({
        tenant_id: profile.tenant_id,
        plan_id: planId,
        billing_period: billingPeriod,
        status: "pending",
        amount_dzd: amount,
      })
      .select("id")
      .single();

    if (subError) return jsonResponse({ error: subError.message }, 400);

    const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:5173";
    const chargilyKey = Deno.env.get("CHARGILY_API_KEY");

    if (!chargilyKey) {
      return jsonResponse({
        error: "Chargily not configured",
        mockCheckoutUrl: `${appUrl}/dashboard/billing?mock=1&sub=${sub.id}`,
      }, 503);
    }

    const checkoutRes = await fetch("https://pay.chargily.net/test/v2/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chargilyKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: "dzd",
        success_url: `${appUrl}/dashboard/billing?success=1`,
        failure_url: `${appUrl}/dashboard/billing?failed=1`,
        description: `mycarta ${plan.name} — ${tenant?.name ?? ""}`,
        locale: "fr",
        metadata: {
          subscription_id: sub.id,
          tenant_id: profile.tenant_id,
          plan_id: planId,
        },
        customer_email: profile.email,
      }),
    });

    const checkout = await checkoutRes.json();
    if (!checkoutRes.ok) {
      return jsonResponse({ error: checkout.message ?? "Chargily error" }, 400);
    }

    await admin
      .from("subscriptions")
      .update({ chargily_checkout_id: checkout.id })
      .eq("id", sub.id);

    return jsonResponse({ checkoutUrl: checkout.checkout_url });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
