// Paste into Supabase Dashboard → Edge Functions → update-worker-password — JWT: ON
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

    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (ownerProfile?.role !== "owner" || !ownerProfile.tenant_id) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const { workerId, password } = await req.json();
    if (!workerId || typeof workerId !== "string") {
      return jsonResponse({ error: "workerId is required" }, 400);
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return jsonResponse({ error: "password must be at least 6 characters" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: worker } = await admin
      .from("profiles")
      .select("id, role, tenant_id")
      .eq("id", workerId)
      .maybeSingle();

    if (!worker || worker.role !== "worker" || worker.tenant_id !== ownerProfile.tenant_id) {
      return jsonResponse({ error: "Worker not found" }, 404);
    }

    const { error } = await admin.auth.admin.updateUserById(workerId, { password });
    if (error) return jsonResponse({ error: error.message }, 400);

    return jsonResponse({ success: true });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
