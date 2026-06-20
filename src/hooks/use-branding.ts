import { useGetSettings } from "@/api";
import { DEFAULT_CARD_DESIGN_ID } from "@/lib/card-templates";
import { PLATFORM } from "@/lib/platform";

const LEGACY_ASSET_PATHS = new Set([
  "/logo.jpg",
  "/card-bg.png",
  "/fidelity-card-bg.png",
  "/admin-icon.png",
  "/employee-icon.png",
  "/client-icon.png",
]);

export function normalizeAssetUrl(url: string | null | undefined) {
  if (!url || LEGACY_ASSET_PATHS.has(url)) return null;
  return url;
}

export function resolveBusinessLogo(
  ...candidates: (string | null | undefined)[]
): string | null {
  for (const url of candidates) {
    const normalized = normalizeAssetUrl(url);
    if (normalized) return normalized;
  }
  return null;
}

export function useShopBranding(slug?: string) {
  const { data: settings, isLoading } = useGetSettings(slug);

  return {
    isLoading,
    businessName: settings?.businessName || PLATFORM.name,
    logoUrl: normalizeAssetUrl(settings?.logoUrl),
    cardTemplateUrl: normalizeAssetUrl(settings?.cardTemplateUrl),
    cardDesignId: settings?.cardDesignId ?? DEFAULT_CARD_DESIGN_ID,
    primaryColor: settings?.primaryColor || PLATFORM.primaryColor,
    secondaryColor: settings?.secondaryColor || PLATFORM.secondaryColor,
    clientLanguage: settings?.clientLanguage ?? "fr",
  };
}

export function usePlatformBranding() {
  return {
    name: PLATFORM.name,
    tagline: PLATFORM.tagline,
    logoUrl: PLATFORM.logoUrl,
    logoDarkUrl: PLATFORM.logoDarkUrl,
    primaryColor: PLATFORM.primaryColor,
    secondaryColor: PLATFORM.secondaryColor,
    supportEmail: PLATFORM.supportEmail,
    socialYoutube: PLATFORM.social.youtube,
    socialInstagram: PLATFORM.social.instagram,
  };
}
