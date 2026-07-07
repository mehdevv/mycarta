import type { SocialLinkKey } from "@/lib/social-links";
import { useId } from "react";

type BrandIconProps = {
  className?: string;
};

/** Compact marks sized for 44px circles — one visual system per platform. */
export function InstagramBrandIcon({ className = "" }: BrandIconProps) {
  const gradId = useId();
  return (
    <svg
      viewBox="0 0 48 48"
      className={`client-social-icon-svg ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFDC80" />
          <stop offset="35%" stopColor="#F77737" />
          <stop offset="65%" stopColor="#E1306C" />
          <stop offset="100%" stopColor="#833AB4" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="12" fill={`url(#${gradId})`} />
      <circle cx="24" cy="24" r="9.5" fill="none" stroke="#fff" strokeWidth="2.6" />
      <circle cx="33.2" cy="14.8" r="2.2" fill="#fff" />
    </svg>
  );
}

export function FacebookBrandIcon({ className = "" }: BrandIconProps) {
  return (
    <svg viewBox="0 0 48 48" className={`client-social-icon-svg ${className}`} aria-hidden>
      <circle cx="24" cy="24" r="20" fill="#1877F2" />
      <path
        fill="#fff"
        d="M27.2 24.8h-2.6v8.4h-3.5v-8.4h-1.8v-2.9h1.8v-1.9c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.5.7-1.5 1.5v1.7h2.6l-.4 2.9z"
      />
    </svg>
  );
}

export function TikTokBrandIcon({ className = "" }: BrandIconProps) {
  return (
    <svg viewBox="0 0 48 48" className={`client-social-icon-svg ${className}`} aria-hidden>
      <circle cx="24" cy="24" r="20" fill="#010101" />
      <path
        fill="#25F4EE"
        d="M30.2 17.2v2.1a5.8 5.8 0 0 1-3.3-1v7.9a5.4 5.4 0 1 1-5.4-5.4c.3 0 .6 0 .9.1v2.5a2.9 2.9 0 1 0 2.1 2.8V14h2.5c.4 1.8 1.6 3.2 3.2 3.2z"
      />
      <path
        fill="#FE2C55"
        d="M31.5 16.5v2.1c-1.2 0-2.3-.4-3.2-1.1v7.9a5.4 5.4 0 1 1-5.4-5.4c.3 0 .6 0 .9.1v2.5a2.9 2.9 0 1 0 2.1 2.8V14h2.5c.4 1.8 1.6 3.2 3.2 3.2z"
        opacity="0.95"
      />
      <path
        fill="#fff"
        d="M30.2 17.2v2.1a5.8 5.8 0 0 1-3.3-1v7.9a5.4 5.4 0 1 1-5.4-5.4c.3 0 .6 0 .9.1v2.5a2.9 2.9 0 1 0 2.1 2.8V14h2.5c.4 1.8 1.6 3.2 3.2 3.2z"
      />
    </svg>
  );
}

export function WhatsAppBrandIcon({ className = "" }: BrandIconProps) {
  return (
    <svg viewBox="0 0 48 48" className={`client-social-icon-svg ${className}`} aria-hidden>
      <circle cx="24" cy="24" r="20" fill="#25D366" />
      <path
        fill="#fff"
        d="M24 12.5c-6.6 0-12 5.2-12 11.6 0 2 .5 3.9 1.5 5.6L12 35.5l6.2-1.6a11.8 11.8 0 0 0 5.8 1.5h.1c6.6 0 12-5.2 12-11.6S30.5 12.5 24 12.5zm0 21.2h-.1a9.6 9.6 0 0 1-4.9-1.3l-.4-.2-3.7 1 1-3.6-.2-.4a9.4 9.4 0 0 1-1.4-5c0-5.2 4.4-9.4 9.8-9.4s9.8 4.2 9.8 9.4-4.4 9.4-9.8 9.4zm5.4-7.1c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.2-.4-2.3-1.5-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.4.2-.7.2-.2.3-.3.4-.5.1-.2.1-.3 0-.5-.1-.2-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.7.3-.2.3-.9.8-.9 2s1 2.3 1.1 2.5c.1.2 2 3 4.8 4.2.7.3 1.2.4 1.6.5.7.2 1.3.2 1.8.1.5-.1 1.8-.7 2.1-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3z"
      />
    </svg>
  );
}

export function WebsiteBrandIcon({ className = "" }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={`client-social-icon-svg ${className}`}
      aria-hidden
      fill="none"
    >
      <circle cx="24" cy="24" r="20" fill="#1A56DB" />
      <circle cx="24" cy="24" r="9.5" stroke="#fff" strokeWidth="2.2" />
      <path d="M24 14.5c2.8 3.2 4.2 6.8 4.2 9.5s-1.4 6.3-4.2 9.5" stroke="#fff" strokeWidth="2.2" />
      <path d="M24 14.5c-2.8 3.2-4.2 6.8-4.2 9.5s1.4 6.3 4.2 9.5" stroke="#fff" strokeWidth="2.2" />
      <path d="M15 24h18" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export const SOCIAL_BRAND_ICONS: Record<SocialLinkKey, typeof InstagramBrandIcon> = {
  instagram: InstagramBrandIcon,
  facebook: FacebookBrandIcon,
  tiktok: TikTokBrandIcon,
  whatsapp: WhatsAppBrandIcon,
  website: WebsiteBrandIcon,
};

export const SOCIAL_BRAND_LABELS: Record<SocialLinkKey, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  website: "Site web",
};

/** Reserve space at bottom of card page when social sheet is visible. */
export const CLIENT_SOCIAL_SHEET_HEIGHT = "4.75rem";
