// Paste into Supabase Dashboard → Edge Functions → create-worker — JWT: ON
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkPlanLimits } from "../_shared/plan-limits.ts";

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

function workerEmail(tenantId: string) {
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return `w.${tenantId.slice(0, 8)}.${id}@workers.mycarta.internal`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

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

    const { fullName, password } = await req.json();
    const trimmedName = typeof fullName === "string" ? fullName.trim() : "";
    if (!trimmedName || trimmedName.length < 2) {
      return jsonResponse({ error: "fullName must be at least 2 characters" }, 400);
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return jsonResponse({ error: "password must be at least 6 characters" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("tenant_id", profile.tenant_id)
      .eq("role", "worker")
      .ilike("full_name", trimmedName)
      .maybeSingle();

    if (existing) {
      return jsonResponse({ error: "A worker with this name already exists" }, 400);
    }

    const limits = await checkPlanLimits(admin, profile.tenant_id, "add_worker");
    if (!limits.allowed) {
      return jsonResponse(
        { error: limits.reason, upgradeRequired: limits.upgrade_required },
        403,
      );
    }

    const email = workerEmail(profile.tenant_id);

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) return jsonResponse({ error: authError.message }, 400);

    const { error: profileError } = await admin.from("profiles").insert({
      id: authUser.user.id,
      tenant_id: profile.tenant_id,
      full_name: trimmedName,
      email,
      role: "worker",
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      return jsonResponse({ error: profileError.message }, 400);
    }

    return jsonResponse({ success: true });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
