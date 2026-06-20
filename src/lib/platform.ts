import defaultLogo from "@/assets/logo.png";
import defaultLogoDark from "@/assets/logowhite.png";

/** Platform-level branding (marketing site, auth, PWA). Override via .env for white-label resellers. */
export const PLATFORM = {
  name: import.meta.env.VITE_PLATFORM_NAME ?? "Carta",
  tagline: import.meta.env.VITE_PLATFORM_TAGLINE ?? "Cartes fidélité digitales pour votre commerce",
  logoUrl: (import.meta.env.VITE_PLATFORM_LOGO_URL as string | undefined) || defaultLogo,
  // Logo variant for dark backgrounds (footer, auth promo panel, etc.)
  logoDarkUrl: (import.meta.env.VITE_PLATFORM_LOGO_DARK_URL as string | undefined) || defaultLogoDark,
  primaryColor: import.meta.env.VITE_PLATFORM_PRIMARY_COLOR ?? "#1A56DB",
  secondaryColor: import.meta.env.VITE_PLATFORM_SECONDARY_COLOR ?? "#0E9F6E",
  supportEmail: import.meta.env.VITE_PLATFORM_SUPPORT_EMAIL ?? "support@mycarta.dz",
};
