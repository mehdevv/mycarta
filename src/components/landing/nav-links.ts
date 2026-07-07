export const LANDING_NAV_LINKS = [
  { sectionId: "features", labelKey: "nav.features" },
  { sectionId: "how-it-works", labelKey: "nav.howItWorks" },
  { sectionId: "pricing", labelKey: "nav.pricing" },
  { sectionId: "security", labelKey: "nav.security" },
] as const;

/** Standalone marketing pages (not in-page anchors). */
export const LANDING_NAV_PAGE_LINKS = [
  { href: "/pulse-fidelite", labelKey: "nav.pulseFidelite" },
] as const;

export const LANDING_FOOTER_PRODUCT_LINKS = LANDING_NAV_LINKS;

export const LANDING_FOOTER_LEGAL_LINKS = [
  { slug: "mentions-legales", labelKey: "landing.footer.legalNotice" },
  { slug: "confidentialite", labelKey: "landing.footer.privacy" },
  { slug: "rgpd", labelKey: "landing.footer.gdpr" },
  { slug: "cookies", labelKey: "landing.footer.cookies" },
  { slug: "conditions", labelKey: "auth.legalTerms" },
] as const;

export type LegalSlug = (typeof LANDING_FOOTER_LEGAL_LINKS)[number]["slug"];
