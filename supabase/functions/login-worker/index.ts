// Paste into Supabase Dashboard → Edge Functions → login-worker — JWT: OFF
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
    const { tenantSlug, fullName, password } = await req.json();
    const trimmedName = typeof fullName === "string" ? fullName.trim() : "";

    if (!tenantSlug || typeof tenantSlug !== "string") {
      return jsonResponse({ error: "tenantSlug is required" }, 400);
    }
    if (!trimmedName) {
      return jsonResponse({ error: "fullName is required" }, 400);
    }
    if (!password || typeof password !== "string") {
      return jsonResponse({ error: "password is required" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tenant } = await admin
      .from("tenants")
      .select("id")
      .eq("slug", tenantSlug.trim())
      .maybeSingle();

    if (!tenant) {
      return jsonResponse({ error: "Invalid name or password" }, 401);
    }

    const { data: worker } = await admin
      .from("profiles")
      .select("id, email, is_active")
      .eq("tenant_id", tenant.id)
      .eq("role", "worker")
      .ilike("full_name", trimmedName)
      .maybeSingle();

    if (!worker?.email || !worker.is_active) {
      return jsonResponse({ error: "Invalid name or password" }, 401);
    }

    const { data: session, error } = await admin.auth.signInWithPassword({
      email: worker.email,
      password,
    });

    if (error || !session.session) {
      return jsonResponse({ error: "Invalid name or password" }, 401);
    }

    return jsonResponse({
      accessToken: session.session.access_token,
      refreshToken: session.session.refresh_token,
    });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
