// Delete tenant and all associated data — JWT: ON (owner only)
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
    if (!user?.email) return jsonResponse({ error: "Unauthorized" }, 401);

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "owner" || !profile.tenant_id) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const { password, confirmSlug } = await req.json();
    if (!password || !confirmSlug) {
      return jsonResponse({ error: "password and confirmSlug are required" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tenant } = await admin
      .from("tenants")
      .select("slug")
      .eq("id", profile.tenant_id)
      .single();

    if (!tenant) return jsonResponse({ error: "Tenant not found" }, 404);

    if (confirmSlug !== tenant.slug) {
      return jsonResponse({ error: "L'identifiant boutique ne correspond pas" }, 400);
    }

    const verifyClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { error: authError } = await verifyClient.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (authError) {
      return jsonResponse({ error: "Mot de passe incorrect" }, 401);
    }

    const { data: members } = await admin
      .from("profiles")
      .select("id")
      .eq("tenant_id", profile.tenant_id);

    const userIds = (members ?? []).map((m) => m.id);

    const { error: deleteError } = await admin
      .from("tenants")
      .delete()
      .eq("id", profile.tenant_id);

    if (deleteError) {
      return jsonResponse({ error: deleteError.message }, 500);
    }

    for (const uid of userIds) {
      const { error: userDeleteError } = await admin.auth.admin.deleteUser(uid);
      if (userDeleteError) {
        console.error(`Failed to delete auth user ${uid}:`, userDeleteError.message);
      }
    }

    return jsonResponse({ success: true });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
