// Paste this ENTIRE file into Supabase Dashboard → Edge Functions → enrol-client
// Endpoint: {VITE_SUPABASE_URL}/functions/v1/enrol-client — JWT: OFF
// Local app: http://localhost:5173/client — All links: supabase/functions/LINKS.md
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

function normalizePhone(phone: string) {
  return phone.replace(/\s+/g, "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const { fullName, phone, email } = await req.json();

    if (!fullName || typeof fullName !== "string") {
      return jsonResponse({ error: "fullName is required" }, 400);
    }
    if (!phone || typeof phone !== "string") {
      return jsonResponse({ error: "phone is required" }, 400);
    }

    const normalizedPhone = normalizePhone(phone);
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: existing } = await admin
      .from("clients")
      .select("card_code, full_name, phone")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    if (existing) {
      return jsonResponse({
        cardCode: existing.card_code,
        fullName: existing.full_name,
        phone: existing.phone,
        existing: true,
      });
    }

    const { data: client, error } = await admin
      .from("clients")
      .insert({
        full_name: fullName.trim(),
        phone: normalizedPhone,
        email: email?.trim() || null,
      })
      .select("card_code, full_name, phone")
      .single();

    if (error) return jsonResponse({ error: error.message }, 400);

    return jsonResponse({
      cardCode: client.card_code,
      fullName: client.full_name,
      phone: client.phone,
      existing: false,
    });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
