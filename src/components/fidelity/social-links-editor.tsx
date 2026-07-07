import {
  EMPTY_SOCIAL_LINKS,
  SOCIAL_LINK_KEYS,
  SOCIAL_LINK_LABELS,
  SOCIAL_LINK_PLACEHOLDERS,
  type SocialLinkKey,
  type SocialLinks,
} from "@/lib/social-links";
import { Facebook, Globe, Instagram, MessageCircle } from "lucide-react";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.53 6.34 6.34 0 0 0 9.49 22a6.34 6.34 0 0 0 6.34-6.34V9.11a8.16 8.16 0 0 0 4.76 1.52V7.18a4.85 4.85 0 0 1-1-.49z" />
    </svg>
  );
}

export const SOCIAL_LINK_ICONS: Record<SocialLinkKey, typeof Instagram> = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: TikTokIcon as typeof Instagram,
  whatsapp: MessageCircle,
  website: Globe,
};

type SocialLinksEditorProps = {
  value: SocialLinks;
  onChange: (next: SocialLinks) => void;
  className?: string;
  compact?: boolean;
};

export default function SocialLinksEditor({
  value,
  onChange,
  className = "",
  compact = false,
}: SocialLinksEditorProps) {
  const links = value ?? EMPTY_SOCIAL_LINKS;

  const patch = (key: SocialLinkKey, raw: string) => {
    onChange({ ...links, [key]: raw });
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <p className={`text-sm font-medium text-[var(--dash-text)] ${compact ? "" : ""}`}>
        Réseaux sociaux
      </p>
      <p className="text-xs text-[var(--dash-text-secondary)]">
        Affichés en permanence sur la carte de vos clients. Optionnel.
      </p>
      <div className="space-y-2.5">
        {SOCIAL_LINK_KEYS.map((key) => {
          const Icon = SOCIAL_LINK_ICONS[key];
          return (
            <label key={key} className="block">
              <span className="mb-1 flex items-center gap-2 text-xs font-medium text-[var(--dash-text-secondary)]">
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {SOCIAL_LINK_LABELS[key]}
              </span>
              <input
                type="text"
                inputMode={key === "whatsapp" ? "tel" : "text"}
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-[var(--dash-border)] px-3 py-2.5 text-sm"
                value={links[key] ?? ""}
                placeholder={SOCIAL_LINK_PLACEHOLDERS[key]}
                onChange={(e) => patch(key, e.target.value)}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
