// Paste this ENTIRE file into Supabase Dashboard → Edge Functions → login-client
// Endpoint: {VITE_SUPABASE_URL}/functions/v1/login-client — JWT: OFF
// Local app: http://localhost:5173/client — All links: supabase/functions/LINKS.md
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";

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

function normalizePhone(phone: string) {
  return phone.replace(/\s+/g, "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const { phone, password } = await req.json();

    if (!phone || typeof phone !== "string") {
      return jsonResponse({ error: "phone is required" }, 400);
    }
    if (!password || typeof password !== "string") {
      return jsonResponse({ error: "password is required" }, 400);
    }

    const normalizedPhone = normalizePhone(phone);
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: client, error } = await admin
      .from("clients")
      .select("id, full_name, card_code, password_hash, is_blocked")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    if (error) return jsonResponse({ error: error.message }, 400);
    if (!client || !client.password_hash) {
      return jsonResponse({ error: "Invalid phone or password" }, 401);
    }
    if (client.is_blocked) {
      return jsonResponse({ error: "This account has been blocked" }, 403);
    }

    const valid = bcrypt.compareSync(password, client.password_hash);
    if (!valid) {
      return jsonResponse({ error: "Invalid phone or password" }, 401);
    }

    return jsonResponse({
      cardCode: client.card_code,
      fullName: client.full_name,
    });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
