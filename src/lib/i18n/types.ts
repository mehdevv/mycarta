export type Locale = "fr" | "en" | "ar";

export const LOCALES: Locale[] = ["fr", "en", "ar"];

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  ar: "العربية",
};

export const LOCALE_STORAGE_KEY = "carta-locale";

export function getLocaleDir(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function normalizeLocale(value: unknown): Locale {
  if (value === "en" || value === "ar") return value;
  return "fr";
}

export function detectInitialLocale(): Locale {
  if (typeof window === "undefined") return "fr";
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored) return normalizeLocale(stored);
  } catch {
    /* ignore */
  }
  const browser = navigator.language.slice(0, 2);
  return normalizeLocale(browser);
}
