// AI loyalty card design — optional edge proxy (client uses .env GROQ_API_KEY by default)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are an expert UI designer for digital loyalty cards (mobile wallet style).
Given the shop owner's description, output ONLY a JSON object (no markdown) with this exact shape:
{
  "primaryColor": "#RRGGBB",
  "secondaryColor": "#RRGGBB",
  "backgroundSvg": "<svg>...</svg>" | null,
  "designSummary": "One short sentence in French explaining the design",
  "suggestedRewardValue": "optional short reward label in French" | null
}

Rules:
- primaryColor and secondaryColor must be valid 6-digit hex colors with good contrast for white text overlays.
- backgroundSvg: optional decorative background ONLY if includeBackground is true in the user message. Use viewBox="0 0 400 240", xmlns="http://www.w3.org/2000/svg". Use gradients, geometric shapes, or subtle patterns — NO text, NO images, NO scripts, NO foreignObject, NO external URLs.
- Keep SVG under 8KB.
- Match the business type and mood from the prompt (luxury, playful, minimal, etc.).
- suggestedRewardValue: only if it fits the business (e.g. café → "Café offert").`;

type AiCardDesign = {
  primaryColor: string;
  secondaryColor: string;
  backgroundSvg: string | null;
  designSummary: string;
  suggestedRewardValue: string | null;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

function sanitizeSvg(svg: string): string | null {
  const trimmed = svg.trim();
  if (!trimmed.toLowerCase().startsWith("<svg")) return null;
  const lower = trimmed.toLowerCase();
  const blocked = ["<script", "javascript:", "onload=", "onclick=", "onerror=", "<iframe", "foreignobject", "xlink:href=\"http"];
  if (blocked.some((b) => lower.includes(b))) return null;
  if (trimmed.length > 12_000) return null;
  return trimmed;
}

function parseAiJson(raw: string): AiCardDesign | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const primary = String(parsed.primaryColor ?? "");
    const secondary = String(parsed.secondaryColor ?? "");
    if (!isHexColor(primary) || !isHexColor(secondary)) return null;

    const bgRaw = parsed.backgroundSvg;
    const backgroundSvg =
      typeof bgRaw === "string" && bgRaw.trim() ? sanitizeSvg(bgRaw) : null;

    const designSummary = String(parsed.designSummary ?? "Design généré par l'IA.").slice(0, 500);
    const rewardRaw = parsed.suggestedRewardValue;
    const suggestedRewardValue =
      typeof rewardRaw === "string" && rewardRaw.trim() ? rewardRaw.trim().slice(0, 120) : null;

    return {
      primaryColor: primary,
      secondaryColor: secondary,
      backgroundSvg,
      designSummary,
      suggestedRewardValue,
    };
  } catch {
    return null;
  }
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
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "owner" || !profile.tenant_id) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) {
      return jsonResponse({ error: "GROQ_API_KEY non configurée" }, 503);
    }

    const body = await req.json();
    const prompt = String(body.prompt ?? "").trim();
    if (prompt.length < 8) {
      return jsonResponse({ error: "Décrivez votre carte en au moins 8 caractères." }, 400);
    }
    if (prompt.length > 1200) {
      return jsonResponse({ error: "Description trop longue (max 1200 caractères)." }, 400);
    }

    const businessName = String(body.businessName ?? "").trim();
    const includeBackground = Boolean(body.includeBackground);
    const currentPrimary = String(body.primaryColor ?? "");
    const currentSecondary = String(body.secondaryColor ?? "");

    const userMessage = [
      `Business: ${businessName || "commerce local"}`,
      `includeBackground: ${includeBackground}`,
      currentPrimary && isHexColor(currentPrimary) ? `Current primary: ${currentPrimary}` : "",
      currentSecondary && isHexColor(currentSecondary) ? `Current secondary: ${currentSecondary}` : "",
      "",
      `Owner request: ${prompt}`,
    ]
      .filter(Boolean)
      .join("\n");

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.65,
        max_tokens: 2048,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq error:", groqRes.status, errText);
      return jsonResponse({ error: "L'IA n'a pas pu générer le design. Réessayez." }, 502);
    }

    const groqData = await groqRes.json();
    const content = groqData?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return jsonResponse({ error: "Réponse IA invalide." }, 502);
    }

    const design = parseAiJson(content);
    if (!design) {
      return jsonResponse({ error: "Format de design invalide. Reformulez votre demande." }, 502);
    }

    if (!includeBackground) {
      design.backgroundSvg = null;
    }

    return jsonResponse({ design });
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Erreur serveur" }, 500);
  }
});
