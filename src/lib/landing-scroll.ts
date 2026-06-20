const PENDING_SCROLL_KEY = "carta-landing-scroll";

export const LANDING_SECTION_HASHES = [
  "features",
  "how-it-works",
  "pricing",
  "security",
  "top",
] as const;

export type LandingSectionHash = (typeof LANDING_SECTION_HASHES)[number];

function navOffset() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--landing-nav-h").trim();
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed + 12 : 84;
}

export function scrollToLandingSection(sectionId: string, behavior: ScrollBehavior = "smooth") {
  const el = document.getElementById(sectionId);
  if (!el) return false;

  const top = el.getBoundingClientRect().top + window.scrollY - navOffset();
  window.scrollTo({ top: Math.max(0, top), behavior });
  return true;
}

export function queueLandingSectionScroll(sectionId: string) {
  try {
    sessionStorage.setItem(PENDING_SCROLL_KEY, sectionId);
  } catch {
    /* ignore */
  }
}

export function consumePendingLandingScroll() {
  try {
    const pending = sessionStorage.getItem(PENDING_SCROLL_KEY);
    if (pending) sessionStorage.removeItem(PENDING_SCROLL_KEY);
    return pending;
  } catch {
    return null;
  }
}

export function scrollToHashFromUrl(behavior: ScrollBehavior = "smooth") {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return false;

  const attempt = (tries: number) => {
    if (scrollToLandingSection(hash, tries === 0 ? behavior : "auto")) return;
    if (tries < 24) requestAnimationFrame(() => attempt(tries + 1));
  };

  attempt(0);
  return true;
}

export function goToLandingSection(
  sectionId: string,
  pathname: string,
  setLocation: (to: string) => void,
) {
  const onLanding = pathname === "/" || pathname === "";

  if (onLanding) {
    scrollToLandingSection(sectionId);
    window.history.replaceState(null, "", `/#${sectionId}`);
    return;
  }

  queueLandingSectionScroll(sectionId);
  setLocation("/");
}
