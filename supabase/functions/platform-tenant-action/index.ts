// Platform admin tenant actions — JWT: ON (super_admin)
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

type Action =
  | "suspend"
  | "extend_trial"
  | "reset_onboarding"
  | "cancel_subscription"
  | "delete_tenant"
  | "delete_subscription";

async function deactivateTenantIfNoActiveSubscriptions(
  admin: ReturnType<typeof createClient>,
  tenantId: string,
  now: string,
) {
  const { count } = await admin
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .in("status", ["active", "pending"]);

  if ((count ?? 0) > 0) return false;

  await admin
    .from("tenants")
    .update({
      subscription_status: "expired",
      subscription_ends_at: now,
      updated_at: now,
    })
    .eq("id", tenantId);

  return true;
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

    const body = await req.json();
    const { tenantId, action, days, confirmSlug, subscriptionId } = body as {
      tenantId?: string;
      action: Action;
      days?: number;
      confirmSlug?: string;
      subscriptionId?: string;
    };

    if (!action) {
      return jsonResponse({ error: "action required" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date().toISOString();

    if (action === "delete_subscription") {
      if (!subscriptionId) {
        return jsonResponse({ error: "subscriptionId required" }, 400);
      }

      const { data: sub, error: subError } = await admin
        .from("subscriptions")
        .select("id, tenant_id, plan_id, status, amount_dzd, billing_period")
        .eq("id", subscriptionId)
        .single();

      if (subError || !sub) {
        return jsonResponse({ error: "Subscription not found" }, 404);
      }

      const { data: tenantRow } = await admin
        .from("tenants")
        .select("id, slug, name")
        .eq("id", sub.tenant_id)
        .single();

      const { error: deleteError } = await admin
        .from("subscriptions")
        .delete()
        .eq("id", subscriptionId);

      if (deleteError) {
        return jsonResponse({ error: deleteError.message }, 500);
      }

      const tenantDeactivated = await deactivateTenantIfNoActiveSubscriptions(
        admin,
        sub.tenant_id,
        now,
      );

      await admin.rpc("log_platform_action", {
        p_action: "platform_delete_subscription",
        p_target_tenant_id: sub.tenant_id,
        p_meta: {
          subscriptionId,
          planId: sub.plan_id,
          previousStatus: sub.status,
          amountDzd: sub.amount_dzd,
          billingPeriod: sub.billing_period,
          tenantDeactivated,
          tenantSlug: tenantRow?.slug ?? null,
          tenantName: tenantRow?.name ?? null,
        },
      });

      return jsonResponse({ success: true, tenantDeactivated });
    }

    if (!tenantId) {
      return jsonResponse({ error: "tenantId required" }, 400);
    }

    const { data: tenant } = await admin
      .from("tenants")
      .select("id, slug, name, subscription_status, trial_ends_at")
      .eq("id", tenantId)
      .single();

    if (!tenant) return jsonResponse({ error: "Tenant not found" }, 404);

    if (action === "suspend") {
      await admin.from("tenants").update({
        subscription_status: "expired",
        updated_at: now,
      }).eq("id", tenantId);
    } else if (action === "extend_trial") {
      const extra = typeof days === "number" && days > 0 ? days : 7;
      const base = tenant.trial_ends_at && new Date(tenant.trial_ends_at) > new Date()
        ? new Date(tenant.trial_ends_at)
        : new Date();
      base.setDate(base.getDate() + extra);
      await admin.from("tenants").update({
        subscription_status: "trialing",
        plan_id: "trial",
        trial_ends_at: base.toISOString(),
        updated_at: now,
      }).eq("id", tenantId);
    } else if (action === "reset_onboarding") {
      await admin.from("tenants").update({
        onboarding_complete: false,
        dashboard_tutorial_complete: false,
        updated_at: now,
      }).eq("id", tenantId);
    } else if (action === "cancel_subscription") {
      await admin.from("subscriptions").update({ status: "canceled", updated_at: now })
        .eq("tenant_id", tenantId).in("status", ["active", "pending"]);
      await admin.from("tenants").update({
        subscription_status: "canceled",
        updated_at: now,
      }).eq("id", tenantId);
    } else if (action === "delete_tenant") {
      if (!confirmSlug || confirmSlug !== tenant.slug) {
        return jsonResponse({ error: "confirmSlug does not match tenant slug" }, 400);
      }
      const { data: members } = await admin.from("profiles").select("id").eq("tenant_id", tenantId);
      const userIds = (members ?? []).map((m) => m.id);
      const { error: deleteError } = await admin.from("tenants").delete().eq("id", tenantId);
      if (deleteError) return jsonResponse({ error: deleteError.message }, 500);
      for (const uid of userIds) {
        await admin.auth.admin.deleteUser(uid);
      }
    } else {
      return jsonResponse({ error: "Unknown action" }, 400);
    }

    await admin.rpc("log_platform_action", {
      p_action: `platform_${action}`,
      p_target_tenant_id: action === "delete_tenant" ? null : tenantId,
      p_meta: { tenantSlug: tenant.slug, tenantName: tenant.name, days: days ?? null },
    });

    return jsonResponse({ success: true });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
