export type AiCardDesignResult = {
  primaryColor: string;
  secondaryColor: string;
  backgroundSvg: string | null;
  designSummary: string;
  suggestedRewardValue: string | null;
};

export type AiCardDesignInput = {
  prompt: string;
  businessName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  includeBackground?: boolean;
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

function getGroqApiKey(): string {
  const key =
    import.meta.env.VITE_GROQ_API_KEY ||
    import.meta.env.GROQ_API_KEY ||
    "";
  if (!key.trim()) {
    throw new Error("Ajoutez GROQ_API_KEY dans votre fichier .env à la racine du projet.");
  }
  return key.trim();
}

function isHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

function sanitizeSvg(svg: string): string | null {
  const trimmed = svg.trim();
  if (!trimmed.toLowerCase().startsWith("<svg")) return null;
  const lower = trimmed.toLowerCase();
  const blocked = [
    "<script",
    "javascript:",
    "onload=",
    "onclick=",
    "onerror=",
    "<iframe",
    "foreignobject",
    'xlink:href="http',
  ];
  if (blocked.some((b) => lower.includes(b))) return null;
  if (trimmed.length > 12_000) return null;
  return trimmed;
}

function parseAiJson(raw: string): AiCardDesignResult | null {
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

export async function generateCardDesignWithGroq(input: AiCardDesignInput): Promise<AiCardDesignResult> {
  const prompt = input.prompt.trim();
  if (prompt.length < 8) {
    throw new Error("Décrivez votre carte en au moins 8 caractères.");
  }

  const includeBackground = Boolean(input.includeBackground);
  const userMessage = [
    `Business: ${input.businessName?.trim() || "commerce local"}`,
    `includeBackground: ${includeBackground}`,
    input.primaryColor && isHexColor(input.primaryColor) ? `Current primary: ${input.primaryColor}` : "",
    input.secondaryColor && isHexColor(input.secondaryColor) ? `Current secondary: ${input.secondaryColor}` : "",
    "",
    `Owner request: ${prompt}`,
  ]
    .filter(Boolean)
    .join("\n");

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getGroqApiKey()}`,
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
    let detail = "";
    try {
      const errBody = await groqRes.json();
      detail = errBody?.error?.message ? `: ${errBody.error.message}` : "";
    } catch {
      // ignore
    }
    throw new Error(`L'IA n'a pas pu générer le design${detail}`);
  }

  const groqData = await groqRes.json();
  const content = groqData?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("Réponse IA invalide.");
  }

  const design = parseAiJson(content);
  if (!design) {
    throw new Error("Format de design invalide. Reformulez votre demande.");
  }

  if (!includeBackground) {
    design.backgroundSvg = null;
  }

  return design;
}
