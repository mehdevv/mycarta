// Chargily webhook — JWT: OFF
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload = await req.json();
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (payload.type !== "checkout.paid" && payload.status !== "paid") {
      return new Response(JSON.stringify({ received: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const metadata = payload.metadata ?? payload.data?.metadata ?? {};
    const subscriptionId = metadata.subscription_id;
    const tenantId = metadata.tenant_id;
    const planId = metadata.plan_id;

    if (!subscriptionId || !tenantId || !planId) {
      return new Response(JSON.stringify({ error: "missing metadata" }), { status: 400 });
    }

    const { data: sub } = await admin
      .from("subscriptions")
      .select("billing_period")
      .eq("id", subscriptionId)
      .single();

    const now = new Date();
    const ends = new Date(now);
    if (sub?.billing_period === "annual") {
      ends.setFullYear(ends.getFullYear() + 1);
    } else {
      ends.setMonth(ends.getMonth() + 1);
    }

    await admin
      .from("subscriptions")
      .update({
        status: "active",
        starts_at: now.toISOString(),
        ends_at: ends.toISOString(),
        chargily_payment_id: payload.id ?? payload.data?.id,
      })
      .eq("id", subscriptionId);

    await admin
      .from("tenants")
      .update({
        plan_id: planId,
        subscription_status: "active",
        subscription_ends_at: ends.toISOString(),
        trial_ends_at: null,
      })
      .eq("id", tenantId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
