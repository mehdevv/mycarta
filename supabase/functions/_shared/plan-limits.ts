// Shared plan limit checks for Edge Functions
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export async function resolveTenantBySlug(
  admin: SupabaseClient,
  slug: string,
) {
  const { data } = await admin
    .from("tenants")
    .select("id, slug, subscription_status, trial_ends_at, subscription_ends_at, plan_id")
    .eq("slug", slug.toLowerCase().trim())
    .maybeSingle();
  return data;
}

export async function checkPlanLimits(
  admin: SupabaseClient,
  tenantId: string,
  check: string,
) {
  const { data, error } = await admin.rpc("check_plan_limits", {
    p_tenant_id: tenantId,
    p_check: check,
  });
  if (error) {
    return { allowed: false, reason: error.message, upgrade_required: false };
  }
  if (!data || typeof data !== "object") {
    return { allowed: true };
  }
  return data as { allowed: boolean; reason?: string; upgrade_required?: boolean };
}

export function planDeniedResponse(result: { reason?: string; upgrade_required?: boolean }) {
  const status = result.reason === "subscription_expired" ? 402 : 403;
  return new Response(
    JSON.stringify({
      error: result.reason ?? "plan_limit",
      upgradeRequired: result.upgrade_required ?? true,
    }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}
