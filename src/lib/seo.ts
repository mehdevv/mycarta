import { PLATFORM } from "@/lib/platform";

/** Canonical production URL — override with VITE_APP_URL in .env */
export const SITE_URL =
  (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, "") ||
  "https://mycarta.online";

export const SITE_NAME = PLATFORM.name;

export const DEFAULT_TITLE = `${SITE_NAME} — Cartes fidélité digitales pour commerces`;

export const DEFAULT_DESCRIPTION =
  PLATFORM.tagline +
  ". Scans QR, tampons et récompenses — sans application à installer pour vos clients.";

export const DEFAULT_OG_IMAGE = "/og-image.png";

export const THEME_COLOR = PLATFORM.primaryColor;

export const TWITTER_HANDLE = "@my.carta.app";

export type PageMetaInput = {
  title?: string;
  description?: string;
  image?: string | null;
  url?: string;
  type?: "website" | "article" | "profile";
  locale?: string;
  noIndex?: boolean;
};

export function absoluteUrl(path: string, origin = SITE_URL): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin.replace(/\/$/, "")}${normalized}`;
}

export function pageTitle(title?: string): string {
  if (!title) return DEFAULT_TITLE;
  if (title.includes(SITE_NAME)) return title;
  return `${title} · ${SITE_NAME}`;
}

export function resolveOgImage(image?: string | null): string {
  const candidate = image?.trim();
  if (candidate && /^https?:\/\//i.test(candidate)) return candidate;
  if (candidate && candidate.startsWith("/")) return absoluteUrl(candidate);
  return absoluteUrl(DEFAULT_OG_IMAGE);
}

export function buildTenantClientMeta(businessName: string, slug: string, logoUrl?: string | null) {
  const name = businessName.trim() || SITE_NAME;
  return {
    title: `Carte fidélité — ${name}`,
    description: `Rejoignez le programme fidélité de ${name}. Créez votre carte gratuite en quelques secondes — sans application.`,
    image: logoUrl,
    url: absoluteUrl(`/${slug}/client`),
    type: "website" as const,
  };
}

export function buildTenantCardMeta(businessName: string, slug: string, logoUrl?: string | null) {
  const name = businessName.trim() || SITE_NAME;
  return {
    title: `Ma carte — ${name}`,
    description: `Consultez votre carte de fidélité digitale chez ${name}. Tampons, récompenses et historique en un clic.`,
    image: logoUrl,
    url: absoluteUrl(`/${slug}/client`),
    type: "website" as const,
  };
}

export const LANDING_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: DEFAULT_DESCRIPTION,
  url: SITE_URL,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "DZD",
    description: "Essai gratuit 14 jours",
  },
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
  },
};
