const STORAGE_KEY = "carta_affiliate_ref";
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

export function persistAffiliateRef(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return;
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ code: normalized, expires: Date.now() + EXPIRY_MS }),
  );
}

export function getPersistedAffiliateRef(): string | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { code?: string; expires?: number };
    if (!parsed.code || !parsed.expires || Date.now() > parsed.expires) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.code;
  } catch {
    return null;
  }
}

export function captureAffiliateRefFromSearch(search: string): string | null {
  const fromUrl = new URLSearchParams(search).get("ref");
  if (fromUrl?.trim()) {
    persistAffiliateRef(fromUrl);
    return fromUrl.trim().toUpperCase();
  }
  return getPersistedAffiliateRef();
}
