const SOCIAL_LINKS_FEATURE_KEY = "carta-feature-social-links-v1-seen";

export function hasSeenSocialLinksFeature(): boolean {
  try {
    return localStorage.getItem(SOCIAL_LINKS_FEATURE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markSocialLinksFeatureSeen(): void {
  try {
    localStorage.setItem(SOCIAL_LINKS_FEATURE_KEY, "1");
  } catch {
    /* ignore */
  }
}
