// Review payment receipt — JWT: ON (super_admin)
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
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "super_admin") {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const { receiptId, action, notes } = await req.json();
    if (!receiptId || !action) {
      return jsonResponse({ error: "receiptId and action required" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: receipt } = await admin
      .from("payment_receipts")
      .select("*")
      .eq("id", receiptId)
      .single();

    if (!receipt) return jsonResponse({ error: "Receipt not found" }, 404);

    const newStatus = action === "approve" ? "approved" : "rejected";

    if (action === "reject" && (!notes || !String(notes).trim())) {
      return jsonResponse({ error: "Un motif de rejet est requis" }, 400);
    }

    await admin
      .from("payment_receipts")
      .update({
        status: newStatus,
        reviewer_notes: notes ?? null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", receiptId);

    if (action === "approve") {
      const now = new Date();
      const ends = new Date(now);
      if (receipt.billing_period === "annual") {
        ends.setFullYear(ends.getFullYear() + 1);
      } else {
        ends.setMonth(ends.getMonth() + 1);
      }

      const { data: newSub } = await admin.from("subscriptions").insert({
        tenant_id: receipt.tenant_id,
        plan_id: receipt.plan_id,
        billing_period: receipt.billing_period,
        status: "active",
        amount_dzd: receipt.amount_dzd,
        starts_at: now.toISOString(),
        ends_at: ends.toISOString(),
      }).select("id").single();

      if (newSub?.id) {
        const { data: tenantRow } = await admin
          .from("tenants")
          .select("referred_affiliate_id")
          .eq("id", receipt.tenant_id)
          .single();

        if (tenantRow?.referred_affiliate_id) {
          await admin.rpc("start_tenant_affiliate_benefit", { p_tenant_id: receipt.tenant_id });
          await admin.rpc("create_affiliate_commission_for_subscription", {
            p_tenant_id: receipt.tenant_id,
            p_subscription_id: newSub.id,
            p_plan_id: receipt.plan_id,
            p_amount_dzd: receipt.amount_dzd,
            p_billing_period: receipt.billing_period,
          });
        } else {
          await admin.rpc("create_sales_commission_for_subscription", {
            p_tenant_id: receipt.tenant_id,
            p_subscription_id: newSub.id,
            p_plan_id: receipt.plan_id,
            p_amount_dzd: receipt.amount_dzd,
          });
        }
      }

      await admin
        .from("tenants")
        .update({
          plan_id: receipt.plan_id,
          subscription_status: "active",
          subscription_ends_at: ends.toISOString(),
          trial_ends_at: null,
        })
        .eq("id", receipt.tenant_id);
    }

    return jsonResponse({ success: true, status: newStatus });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
