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

    const { fullName, email, password } = await req.json();
    if (!fullName || !email || !password) {
      return jsonResponse({ error: "fullName, email, and password are required" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const limits = await checkPlanLimits(admin, profile.tenant_id, "add_worker");
    if (!limits.allowed) {
      return jsonResponse(
        { error: limits.reason, upgradeRequired: limits.upgrade_required },
        403,
      );
    }

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) return jsonResponse({ error: authError.message }, 400);

    const { error: profileError } = await admin.from("profiles").insert({
      id: authUser.user.id,
      tenant_id: profile.tenant_id,
      full_name: fullName,
      email,
      role: "worker",
    });

    if (profileError) return jsonResponse({ error: profileError.message }, 400);

    return jsonResponse({ success: true });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
