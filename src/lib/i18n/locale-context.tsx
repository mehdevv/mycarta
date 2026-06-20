import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  detectInitialLocale,
  getLocaleDir,
  getT,
  LOCALE_STORAGE_KEY,
  normalizeLocale,
  type Locale,
  type TFunction,
} from "@/lib/i18n";

type LocaleContextValue = {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: TFunction;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function applyDocumentLocale(locale: Locale) {
  const dir = getLocaleDir(locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = dir;
  document.documentElement.classList.toggle("is-rtl", dir === "rtl");
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectInitialLocale());

  const setLocale = useCallback((next: Locale) => {
    const normalized = normalizeLocale(next);
    setLocaleState(normalized);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, normalized);
    } catch {
      /* ignore */
    }
  }, []);

  const dir = getLocaleDir(locale);
  const t = useMemo(() => getT(locale), [locale]);

  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  const value = useMemo(
    () => ({ locale, dir, t, setLocale }),
    [locale, dir, t, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}
