// Create sales rep — JWT: ON (super_admin)
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

    const { fullName, email, phone, password } = await req.json();
    const trimmedName = typeof fullName === "string" ? fullName.trim() : "";
    const trimmedEmail = typeof email === "string" ? email.trim() : "";
    const normalizedPhone = String(phone ?? "").replace(/\D/g, "");

    if (!trimmedName || trimmedName.length < 2) {
      return jsonResponse({ error: "fullName must be at least 2 characters" }, 400);
    }
    if (!trimmedEmail) return jsonResponse({ error: "email is required" }, 400);
    if (normalizedPhone.length < 8) {
      return jsonResponse({ error: "phone must be at least 8 digits" }, 400);
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return jsonResponse({ error: "password must be at least 8 characters" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("email", trimmedEmail)
      .maybeSingle();

    if (existing) {
      return jsonResponse({ error: "Un compte existe déjà avec cet email" }, 400);
    }

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: trimmedEmail,
      password,
      email_confirm: true,
    });

    if (authError) return jsonResponse({ error: authError.message }, 400);

    const { error: profileError } = await admin.from("profiles").insert({
      id: authUser.user.id,
      tenant_id: null,
      full_name: trimmedName,
      email: trimmedEmail,
      phone: normalizedPhone,
      role: "sales_rep",
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      return jsonResponse({ error: profileError.message }, 400);
    }

    return jsonResponse({ success: true, repId: authUser.user.id });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
