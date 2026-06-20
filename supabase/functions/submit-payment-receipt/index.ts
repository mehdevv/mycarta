// BaridiMob / CCP receipt upload — JWT: ON (owner)
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
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "owner" || !profile.tenant_id) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const { planId, billingPeriod, amountDzd, receiptUrl, paymentMethod } = await req.json();

    if (!planId || !billingPeriod || !amountDzd || !receiptUrl) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await admin
      .from("payment_receipts")
      .insert({
        tenant_id: profile.tenant_id,
        plan_id: planId,
        billing_period: billingPeriod,
        amount_dzd: amountDzd,
        receipt_url: receiptUrl,
        payment_method: paymentMethod ?? "baridimob",
        status: "pending",
      })
      .select("id")
      .single();

    if (error) return jsonResponse({ error: error.message }, 400);

    return jsonResponse({ success: true, receiptId: data.id });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
