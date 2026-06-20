import { appLink } from "@/lib/links";

/** Normalize scanned or typed input to a 6-digit card code when possible. */
export function normalizeCardCode(raw: string): string {
  const trimmed = raw.trim();
  const fromUrl = (() => {
    try {
      const parts = new URL(trimmed).pathname.split("/").filter(Boolean);
      return parts[parts.length - 1] ?? trimmed;
    } catch {
      return trimmed;
    }
  })();

  const digits = fromUrl.replace(/\D/g, "");
  if (digits.length >= 6) {
    return digits.slice(-6).padStart(6, "0");
  }
  if (/^\d{1,6}$/.test(fromUrl)) {
    return fromUrl.padStart(6, "0");
  }
  return fromUrl;
}

export function isCardCode(value: string): boolean {
  return /^\d{6}$/.test(value);
}

export function formatCardCode(code: string): string {
  const normalized = normalizeCardCode(code);
  if (!isCardCode(normalized)) return code;
  return `${normalized.slice(0, 3)} ${normalized.slice(3)}`;
}

export function cardPageUrl(code: string, slug?: string): string {
  const path = slug
    ? `/${slug}/card/${normalizeCardCode(code)}`
    : `/card/${normalizeCardCode(code)}`;
  return appLink(path);
}
