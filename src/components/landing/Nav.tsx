import { useEffect, useState } from "react";

import { Link, useLocation, useSearch } from "wouter";

import BrandLogo from "@/components/brand/mascot";
import { useGetSettings } from "@/api";
import { usePlatformBranding, resolveBusinessLogo } from "@/hooks/use-branding";

import { useLocale } from "@/lib/i18n/locale-context";

import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { LandingSectionLink } from "./LandingSectionLink";

import { LANDING_NAV_LINKS } from "./nav-links";
import { PulseNavLink } from "./pulse-nav-link";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import defaultProfileAvatar from "@/assets/default-profile-avatar.png";

const SCROLL_THRESHOLD = 24;

function LandingNavAuthLoader({ compact = false }: { compact?: boolean }) {
  const { t } = useLocale();
  return (
    <div
      className={cn("landing-nav-auth-loader", compact && "landing-nav-auth-loader--compact")}
      role="status"
      aria-live="polite"
      aria-label={t("common.loading")}
    >
      <span className="landing-nav-auth-loader-spinner" aria-hidden />
    </div>
  );
}

function LandingNavGuestActions({
  onSignupTab,
  compact = false,
}: {
  onSignupTab: boolean;
  compact?: boolean;
}) {
  const { t } = useLocale();

  if (compact) {
    if (onSignupTab) return null;
    return (
      <Link href="/shop?tab=signup" className="btn-pill text-[13px] px-3.5 py-1.5 min-h-[36px]">
        {t("nav.freeTrialShort")}
      </Link>
    );
  }

  return (
    <>
      <Link href="/shop" className="landing-nav-btn-outline">
        {t("common.login")}
      </Link>
      {onSignupTab ? (
        <span className="btn-pill opacity-60 cursor-default pointer-events-none">
          {t("common.signup")}
        </span>
      ) : (
        <Link href="/shop?tab=signup" className="btn-pill">
          {t("nav.freeTrial")}
        </Link>
      )}
    </>
  );
}

function LandingNavAccountButton({
  email,
  avatarUrl,
  className,
  onClick,
}: {
  email: string;
  fullName: string;
  avatarUrl: string | null;
  className?: string;
  onClick?: () => void;
}) {
  const profileSrc = avatarUrl ?? defaultProfileAvatar;

  return (
    <Link
      href="/dashboard"
      className={cn("landing-nav-account-btn", className)}
      title={email}
      onClick={onClick}
    >
      <Avatar className="landing-nav-account-avatar">
        <AvatarImage src={profileSrc} alt="" className="object-cover" />
        <AvatarFallback className="landing-nav-account-avatar-fallback p-0">
          <img
            src={defaultProfileAvatar}
            alt=""
            className="h-full w-full rounded-full object-cover"
          />
        </AvatarFallback>
      </Avatar>
      <span className="landing-nav-account-email">{email}</span>
    </Link>
  );
}

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();
  const search = useSearch();
  const onSignupTab = location === "/shop" && new URLSearchParams(search).get("tab") === "signup";
  const platform = usePlatformBranding();
  const { t } = useLocale();
  const { businessUser, isBusinessAuthenticated, isBusinessLoading } = useAuth();
  const canLoadShopBranding = isBusinessAuthenticated && !!businessUser?.tenantId;
  const { data: shopSettings } = useGetSettings(undefined, { enabled: canLoadShopBranding });
  const accountAvatarUrl = resolveBusinessLogo(shopSettings?.logoUrl);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("is-nav-scrolled", scrolled);
    return () => document.documentElement.classList.remove("is-nav-scrolled");
  }, [scrolled]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const closeMobile = () => setOpen(false);

  return (
    <header className="landing-nav-shell">
      <div className="landing-nav-shell-inner">
        <div className={cn("landing-nav-float", scrolled && "is-scrolled")}>
          <Link href="/" className="landing-nav-brand">
            <BrandLogo
              role="admin"
              size="xs"
              animate={false}
              logoUrl={platform.logoUrl}
              alt={platform.name}
              primaryColor="#888888"
            />
            <span className="landing-nav-brand-text">{platform.name}</span>
          </Link>

          <nav className="landing-nav-center" aria-label={t("nav.mainAria")}>
            {LANDING_NAV_LINKS.map((l) => (
              <LandingSectionLink
                key={l.sectionId}
                sectionId={l.sectionId}
                title={t(l.labelKey)}
                className="landing-nav-link px-2.5 rounded-full hover:bg-[var(--landing-bg-secondary)]"
              >
                {t(l.labelKey)}
              </LandingSectionLink>
            ))}
            <PulseNavLink
              variant="icon"
              className="rounded-full hover:bg-[var(--landing-bg-secondary)]"
            />
          </nav>

          <div className="landing-nav-end">
            <div className="landing-nav-actions">
              {isBusinessLoading ? (
                <LandingNavAuthLoader />
              ) : isBusinessAuthenticated && businessUser ? (
                <LandingNavAccountButton
                  email={businessUser.email}
                  fullName={businessUser.fullName}
                  avatarUrl={accountAvatarUrl}
                />
              ) : (
                <LandingNavGuestActions onSignupTab={onSignupTab} />
              )}
            </div>

            <div className="landing-nav-actions-mobile">
              {isBusinessLoading ? (
                <LandingNavAuthLoader compact />
              ) : isBusinessAuthenticated && businessUser ? (
                <LandingNavAccountButton
                  email={businessUser.email}
                  fullName={businessUser.fullName}
                  avatarUrl={accountAvatarUrl}
                  className="landing-nav-account-btn--compact"
                />
              ) : (
                <LandingNavGuestActions onSignupTab={onSignupTab} compact />
              )}

              <button
                type="button"
                className="landing-nav-menu-btn"
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
                aria-expanded={open}
              >
                <div className="flex flex-col gap-1.5 w-5">
                  <span
                    className="block h-[2px] bg-[var(--landing-text)] transition-transform origin-center"
                    style={{ transform: open ? "translateY(5px) rotate(45deg)" : undefined }}
                  />
                  <span
                    className="block h-[2px] bg-[var(--landing-text)] transition-opacity"
                    style={{ opacity: open ? 0 : 1 }}
                  />
                  <span
                    className="block h-[2px] bg-[var(--landing-text)] transition-transform origin-center"
                    style={{ transform: open ? "translateY(-5px) rotate(-45deg)" : undefined }}
                  />
                </div>
              </button>
            </div>

            <LanguageSwitcher variant="circle" className="hidden sm:block shrink-0" />
          </div>
        </div>
      </div>

      {open && (
        <div className="landing-nav-mobile-panel">
          <div className="container-page py-8 flex flex-col">
            <div className="mb-4 sm:hidden">
              <LanguageSwitcher />
            </div>

            {isBusinessLoading ? (
              <div className="mb-6">
                <LandingNavAuthLoader />
              </div>
            ) : (
              <>
                {!onSignupTab && !isBusinessAuthenticated && (
                  <Link
                    href="/shop?tab=signup"
                    className="btn-pill w-full justify-center mb-6"
                    onClick={closeMobile}
                  >
                    {t("nav.startFreeTrial")}
                  </Link>
                )}

                {isBusinessAuthenticated && businessUser && (
                  <LandingNavAccountButton
                    email={businessUser.email}
                    fullName={businessUser.fullName}
                    avatarUrl={accountAvatarUrl}
                    className="landing-nav-account-btn--mobile w-full mb-6"
                    onClick={closeMobile}
                  />
                )}
              </>
            )}

            {LANDING_NAV_LINKS.map((l) => (
              <LandingSectionLink
                key={l.sectionId}
                sectionId={l.sectionId}
                className="landing-nav-link py-4 text-[18px] border-b border-[var(--landing-border)]"
                onNavigate={closeMobile}
              >
                {t(l.labelKey)}
              </LandingSectionLink>
            ))}

            <PulseNavLink
              variant="full"
              className="landing-nav-link py-4 text-[18px] border-b border-[var(--landing-border)]"
              onClick={closeMobile}
            />

            <Link
              href="/client"
              className="landing-nav-link py-4 text-[18px] border-b border-[var(--landing-border)]"
              onClick={closeMobile}
            >
              {t("nav.findShop")}
            </Link>

            {!isBusinessLoading && !isBusinessAuthenticated && (
              <Link href="/shop" className="landing-nav-link py-4 text-[17px] mt-2" onClick={closeMobile}>
                {t("common.login")}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
