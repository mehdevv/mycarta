export type SocialLinkKey = "instagram" | "facebook" | "tiktok" | "whatsapp" | "website";

export type SocialLinks = Partial<Record<SocialLinkKey, string>>;

export const SOCIAL_LINK_KEYS: SocialLinkKey[] = [
  "instagram",
  "facebook",
  "tiktok",
  "whatsapp",
  "website",
];

export const EMPTY_SOCIAL_LINKS: SocialLinks = {};

const KEY_ALIASES: Record<string, SocialLinkKey> = {
  instagram: "instagram",
  facebook: "facebook",
  tiktok: "tiktok",
  whatsapp: "whatsapp",
  website: "website",
};

function stripAt(value: string): string {
  return value.trim().replace(/^@+/, "");
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function withHttps(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeSocialLink(key: SocialLinkKey, raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  if (key === "whatsapp") {
    const digits = digitsOnly(value);
    if (digits.length < 8) return null;
    return `https://wa.me/${digits}`;
  }

  if (key === "instagram") {
    if (/^https?:\/\//i.test(value)) {
      return isValidHttpUrl(value) ? value : null;
    }
    const handle = stripAt(value);
    if (!handle) return null;
    return `https://instagram.com/${handle}`;
  }

  if (key === "tiktok") {
    if (/^https?:\/\//i.test(value)) {
      return isValidHttpUrl(value) ? value : null;
    }
    const handle = stripAt(value);
    if (!handle) return null;
    return `https://www.tiktok.com/@${handle}`;
  }

  if (key === "facebook") {
    const url = withHttps(value);
    return isValidHttpUrl(url) ? url : null;
  }

  const url = withHttps(value);
  return isValidHttpUrl(url) ? url : null;
}

export function sanitizeSocialLinks(links: SocialLinks): SocialLinks {
  const out: SocialLinks = {};
  for (const key of SOCIAL_LINK_KEYS) {
    const raw = links[key];
    if (!raw?.trim()) continue;
    const normalized = normalizeSocialLink(key, raw);
    if (normalized) out[key] = normalized;
  }
  return out;
}

export function parseSocialLinks(raw: unknown): SocialLinks {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return EMPTY_SOCIAL_LINKS;
  const out: SocialLinks = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const mapped = KEY_ALIASES[key];
    if (!mapped || typeof value !== "string") continue;
    const normalized = normalizeSocialLink(mapped, value);
    if (normalized) out[mapped] = normalized;
  }
  return out;
}

export function hasSocialLinks(links: SocialLinks | undefined | null): boolean {
  if (!links) return false;
  return SOCIAL_LINK_KEYS.some((key) => Boolean(links[key]?.trim()));
}

export const SOCIAL_LINK_LABELS: Record<SocialLinkKey, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  website: "Site web",
};

export const SOCIAL_LINK_PLACEHOLDERS: Record<SocialLinkKey, string> = {
  instagram: "@votre_compte ou lien",
  facebook: "facebook.com/votre-page",
  tiktok: "@votre_compte ou lien",
  whatsapp: "0555 123 456",
  website: "www.votre-site.dz",
};
