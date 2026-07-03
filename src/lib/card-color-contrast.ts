import { getCardTemplate } from "@/lib/card-templates";

const LIGHT_PANEL = "#ffffff";
const DARK_PANEL = "#1e2433";
const MIN_PRIMARY_CONTRAST = 4.5;
const MIN_SECONDARY_CONTRAST = 3;
const MIN_PAIR_CONTRAST = 1.8;

export function normalizeHex(color: string): string | null {
  const trimmed = color.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = normalizeHex(hex);
  if (!n) return [26, 86, 219];
  return [
    parseInt(n.slice(1, 3), 16),
    parseInt(n.slice(3, 5), 16),
    parseInt(n.slice(5, 7), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(normalizeHex(foreground) ?? foreground);
  const b = relativeLuminance(normalizeHex(background) ?? background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

export function getCardPanelBackground(cardDesignId?: string | null): string {
  const layout = getCardTemplate(cardDesignId).layout;
  return layout === "dark" ? DARK_PANEL : LIGHT_PANEL;
}

export function isReadableOnCardPanel(
  color: string,
  cardDesignId?: string | null,
  minRatio = MIN_PRIMARY_CONTRAST,
): boolean {
  const hex = normalizeHex(color);
  if (!hex) return false;
  return contrastRatio(hex, getCardPanelBackground(cardDesignId)) >= minRatio;
}

function panelContrastHint(cardDesignId?: string | null): string {
  return getCardPanelBackground(cardDesignId) === DARK_PANEL
    ? "Choisissez une teinte plus claire pour ce modèle de carte sombre."
    : "Choisissez une teinte plus foncée — le texte doit rester lisible sur fond blanc.";
}

export function validateCardPrimaryColor(
  primary: string,
  secondary: string,
  cardDesignId?: string | null,
): string | null {
  const hex = normalizeHex(primary);
  if (!hex) return "Couleur invalide.";

  if (!isReadableOnCardPanel(hex, cardDesignId, MIN_PRIMARY_CONTRAST)) {
    return panelContrastHint(cardDesignId);
  }

  const secondaryHex = normalizeHex(secondary);
  if (secondaryHex && contrastRatio(hex, secondaryHex) < MIN_PAIR_CONTRAST) {
    return "La couleur principale est trop proche de la couleur secondaire.";
  }

  return null;
}

export function validateCardSecondaryColor(
  primary: string,
  secondary: string,
  cardDesignId?: string | null,
): string | null {
  const hex = normalizeHex(secondary);
  if (!hex) return "Couleur invalide.";

  if (!isReadableOnCardPanel(hex, cardDesignId, MIN_SECONDARY_CONTRAST)) {
    return panelContrastHint(cardDesignId);
  }

  const primaryHex = normalizeHex(primary);
  if (primaryHex && contrastRatio(hex, primaryHex) < MIN_PAIR_CONTRAST) {
    return "La couleur secondaire est trop proche de la couleur principale.";
  }

  return null;
}

function adjustForBackground(color: string, background: string, minRatio: number): string {
  const hex = normalizeHex(color) ?? "#1A56DB";
  if (contrastRatio(hex, background) >= minRatio) return hex;

  const lighten = relativeLuminance(background) < 0.4;
  const step = lighten ? 7 : -7;
  let [r, g, b] = hexToRgb(hex);

  for (let i = 0; i < 48; i += 1) {
    r += step;
    g += step;
    b += step;
    const next = rgbToHex(r, g, b);
    if (contrastRatio(next, background) >= minRatio) return next;
  }

  return lighten ? "#f3f4f6" : "#1A56DB";
}

function separateSecondary(primary: string, secondary: string): string {
  const p = normalizeHex(primary) ?? "#1A56DB";
  let s = normalizeHex(secondary) ?? "#0E9F6E";
  if (contrastRatio(p, s) >= MIN_PAIR_CONTRAST) return s;

  const [pr, pg, pb] = hexToRgb(p);
  for (let i = 1; i <= 24; i += 1) {
    const candidate = rgbToHex(pr + i * 9, pg - i * 4, pb + i * 6);
    if (contrastRatio(p, candidate) >= MIN_PAIR_CONTRAST) return candidate;
  }
  return "#0E9F6E";
}

/** Auto-fix colors from logo extraction or AI when the user did not pick manually. */
export function enforceCardColorPair(
  primary: string,
  secondary: string,
  cardDesignId?: string | null,
): { primary: string; secondary: string } {
  const panel = getCardPanelBackground(cardDesignId);
  const nextPrimary = adjustForBackground(primary, panel, MIN_PRIMARY_CONTRAST);
  let nextSecondary = adjustForBackground(secondary, panel, MIN_SECONDARY_CONTRAST);
  nextSecondary = separateSecondary(nextPrimary, nextSecondary);
  return { primary: nextPrimary, secondary: nextSecondary };
}

export function readableAccentColor(
  color: string,
  cardDesignId?: string | null,
  fallback = "#1A56DB",
): string {
  const hex = normalizeHex(color);
  if (!hex) return fallback;
  return isReadableOnCardPanel(hex, cardDesignId, 3) ? hex : fallback;
}
