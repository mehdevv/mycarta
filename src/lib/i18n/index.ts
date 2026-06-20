import { messages as fr } from "./messages/fr";
import { messages as en } from "./messages/en";
import { messages as ar } from "./messages/ar";
import { createT, type TFunction } from "./create-t";
import type { Locale } from "./types";

const catalogs: Record<Locale, typeof fr> = { fr, en, ar };

export function getMessages(locale: Locale) {
  return catalogs[locale];
}

export function getT(locale: Locale): TFunction {
  return createT(catalogs[locale]);
}

export { createT, type TFunction };
export type { Locale, Messages } from "./types";
export { LOCALES, LOCALE_LABELS, LOCALE_STORAGE_KEY, getLocaleDir, normalizeLocale, detectInitialLocale } from "./types";
