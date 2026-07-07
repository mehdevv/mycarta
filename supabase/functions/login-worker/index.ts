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
    const { tenantSlug, fullName, password, workerQrToken } = await req.json();
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (workerQrToken && typeof workerQrToken === "string") {
      const token = workerQrToken.trim();
      if (!/^[0-9a-f-]{36}$/i.test(token)) {
        return jsonResponse({ error: "Invalid login QR code" }, 400);
      }

      const { data: worker } = await admin
        .from("profiles")
        .select("id, email, is_active, tenant_id")
        .eq("worker_qr_token", token)
        .eq("role", "worker")
        .maybeSingle();

      if (!worker?.email || !worker.is_active) {
        return jsonResponse({ error: "Invalid or inactive worker QR code" }, 401);
      }

      if (tenantSlug && typeof tenantSlug === "string") {
        const { data: tenant } = await admin
          .from("tenants")
          .select("id")
          .eq("slug", tenantSlug.trim())
          .maybeSingle();
        if (!tenant || tenant.id !== worker.tenant_id) {
          return jsonResponse({ error: "This QR code belongs to another shop" }, 401);
        }
      }

      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: worker.email,
      });

      if (linkError || !linkData?.properties?.hashed_token) {
        return jsonResponse({ error: "Could not start worker session" }, 500);
      }

      const { data: sessionData, error: sessionError } = await admin.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: "email",
      });

      if (sessionError || !sessionData.session) {
        return jsonResponse({ error: "Could not start worker session" }, 500);
      }

      return jsonResponse({
        accessToken: sessionData.session.access_token,
        refreshToken: sessionData.session.refresh_token,
      });
    }

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
