import { Link } from "wouter";

import { useLocale } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

type PulseNavLinkProps = {
  className?: string;
  onClick?: () => void;
  /** Icon-only in desktop nav; full row with label on mobile. */
  variant?: "icon" | "full";
};

/** Mini loyalty card silhouette — shine effects applied via CSS. */
const CARD_BODY =
  "M4.5 7.5h15a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2z";

function PulseCardIcon() {
  return (
    <span className="pulse-nav-card" aria-hidden>
      <span className="pulse-nav-card-glow" />
      <span className="pulse-nav-card-rays" />
      {["a", "b", "c", "d", "e", "f"].map((id) => (
        <span key={id} className={`pulse-nav-sparkle pulse-nav-sparkle--${id}`} />
      ))}
      <span className="pulse-nav-card-shape">
        <span className="pulse-nav-card-bounce">
        <svg className="pulse-nav-card-svg" viewBox="3 6 19 11.5" fill="none">
        <defs>
          <linearGradient id="pulse-card-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" className="pulse-nav-card-stop-1" />
            <stop offset="35%" className="pulse-nav-card-stop-2" />
            <stop offset="70%" className="pulse-nav-card-stop-3" />
            <stop offset="100%" className="pulse-nav-card-stop-4" />
          </linearGradient>
        </defs>
        <path
          d={CARD_BODY}
          fill="url(#pulse-card-fill)"
          stroke="none"
        />
        <path
          d={CARD_BODY}
          fill="none"
          stroke="#ffffff"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <rect x="6.5" y="9.5" width="3.8" height="2.6" rx="0.55" fill="rgba(255,255,255,0.42)" />
        <circle cx="15.8" cy="13.2" r="0.85" fill="rgba(255,255,255,0.55)" />
        <circle cx="18" cy="13.2" r="0.85" fill="rgba(255,255,255,0.55)" />
        <circle cx="20.2" cy="13.2" r="0.85" fill="rgba(255,255,255,0.32)" />
        </svg>
        <span className="pulse-nav-card-shine" />
        </span>
      </span>
    </span>
  );
}

export function PulseNavLink({ className, onClick, variant = "icon" }: PulseNavLinkProps) {
  const { t } = useLocale();
  const label = t("nav.pulseFidelite");

  return (
    <Link
      href="/pulse-fidelite"
      className={cn(
        "pulse-nav-link",
        variant === "icon" && "pulse-nav-link--icon",
        variant === "full" && "pulse-nav-link--full",
        className,
      )}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <PulseCardIcon />
      {variant === "full" && <span className="pulse-nav-link-label">{label}</span>}
    </Link>
  );
}
