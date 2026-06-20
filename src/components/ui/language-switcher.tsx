import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-context";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LOCALE_SHORT: Record<Locale, string> = {
  fr: "FR",
  en: "EN",
  ar: "AR",
};

type LanguageSwitcherProps = {
  className?: string;
  variant?: "default" | "compact" | "circle";
};

export function LanguageSwitcher({ className, variant = "default" }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isCircle = variant === "circle";

  useEffect(() => {
    if (!open || isCircle) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, isCircle]);

  const select = (next: Locale) => {
    setLocale(next);
    setOpen(false);
  };

  const menu = (
    <ul className="lang-switcher-menu" role="listbox" aria-label="Select language">
      {LOCALES.map((code) => (
        <li key={code} role="option" aria-selected={locale === code}>
          <button
            type="button"
            className={cn("lang-switcher-option", locale === code && "is-active")}
            onClick={() => select(code)}
            lang={code}
            dir={code === "ar" ? "rtl" : "ltr"}
          >
            <span>{LOCALE_LABELS[code]}</span>
            {locale === code && <Check size={14} aria-hidden />}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div ref={ref} className={cn("lang-switcher", isCircle && "lang-switcher--circle", className)}>
      <button
        type="button"
        className={cn(
          "lang-switcher-trigger",
          variant === "compact" && "lang-switcher-trigger--compact",
          isCircle && "lang-switcher-trigger--circle",
        )}
        onClick={() => !isCircle && setOpen((v) => !v)}
        aria-label="Language selector"
        aria-haspopup="listbox"
        aria-expanded={isCircle ? undefined : open}
      >
        <span className="lang-switcher-label">
          {isCircle ? LOCALE_SHORT[locale] : LOCALE_LABELS[locale]}
        </span>
        {!isCircle && (
          <ChevronDown size={14} className={cn("lang-switcher-chevron", open && "is-open")} />
        )}
      </button>

      {isCircle ? menu : open && menu}
    </div>
  );
}
