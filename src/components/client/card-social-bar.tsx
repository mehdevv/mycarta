import {
  hasSocialLinks,
  SOCIAL_LINK_KEYS,
  type SocialLinkKey,
  type SocialLinks,
} from "@/lib/social-links";
import { useClientI18n } from "@/hooks/use-client-i18n";
import {
  CLIENT_SOCIAL_SHEET_HEIGHT,
  SOCIAL_BRAND_ICONS,
  SOCIAL_BRAND_LABELS,
} from "@/components/client/social-brand-icons";

const LINK_MODIFIER: Record<SocialLinkKey, string> = {
  instagram: "client-social-sheet-link--instagram",
  facebook: "client-social-sheet-link--facebook",
  tiktok: "client-social-sheet-link--tiktok",
  whatsapp: "client-social-sheet-link--whatsapp",
  website: "client-social-sheet-link--website",
};

type CardSocialBarProps = {
  links?: SocialLinks | null;
  className?: string;
};

export default function CardSocialBar({ links, className = "" }: CardSocialBarProps) {
  const { t } = useClientI18n();

  if (!hasSocialLinks(links)) return null;

  const active = SOCIAL_LINK_KEYS.filter((key) => links?.[key]?.trim());

  return (
    <div
      className={`client-social-sheet ${className}`}
      role="navigation"
      aria-label={t("followUs")}
      style={{
        ["--client-social-sheet-h" as string]: CLIENT_SOCIAL_SHEET_HEIGHT,
      }}
    >
      <div className="client-social-sheet-inner">
        <div className="client-social-sheet-row">
          {active.map((key) => {
            const Icon = SOCIAL_BRAND_ICONS[key];
            const href = links![key]!;
            return (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`client-social-sheet-link ${LINK_MODIFIER[key]}`}
                aria-label={SOCIAL_BRAND_LABELS[key]}
              >
                <Icon />
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
