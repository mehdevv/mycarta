import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import BrandLogo from "@/components/brand/mascot";
import { usePlatformBranding } from "@/hooks/use-branding";
import { LANDING_NAV_LINKS } from "./nav-links";
import { cn } from "@/lib/utils";

const SCROLL_THRESHOLD = 24;

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();
  const search = useSearch();
  const onSignupTab = location === "/shop" && new URLSearchParams(search).get("tab") === "signup";
  const platform = usePlatformBranding();

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

          <nav className="landing-nav-center" aria-label="Navigation principale">
            {LANDING_NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="landing-nav-link px-3 rounded-full hover:bg-[var(--landing-bg-secondary)]"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="landing-nav-end">
            <div className="landing-nav-actions">
              <Link href="/shop" className="landing-nav-btn-outline">
                Connexion
              </Link>
              {onSignupTab ? (
                <span className="btn-pill opacity-60 cursor-default pointer-events-none">Inscription</span>
              ) : (
                <Link href="/shop?tab=signup" className="btn-pill">
                  Essai gratuit
                </Link>
              )}
            </div>

            <div className="landing-nav-actions-mobile">
              {!onSignupTab && (
                <Link href="/shop?tab=signup" className="btn-pill text-[13px] px-3.5 py-1.5 min-h-[36px]">
                  Essai
                </Link>
              )}
              <button
                type="button"
                className="landing-nav-menu-btn"
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
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
          </div>
        </div>
      </div>

      {open && (
        <div className="landing-nav-mobile-panel">
          <div className="container-page py-8 flex flex-col">
            {!onSignupTab && (
              <Link
                href="/shop?tab=signup"
                className="btn-pill w-full justify-center mb-6"
                onClick={() => setOpen(false)}
              >
                Démarrer l&apos;essai gratuit
              </Link>
            )}
            {LANDING_NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="landing-nav-link py-4 text-[18px] border-b border-[var(--landing-border)]"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/#security"
              className="landing-nav-link py-4 text-[18px] border-b border-[var(--landing-border)]"
              onClick={() => setOpen(false)}
            >
              Sécurité
            </Link>
            <Link
              href="/client"
              className="landing-nav-link py-4 text-[18px] border-b border-[var(--landing-border)]"
              onClick={() => setOpen(false)}
            >
              Trouver un commerce
            </Link>
            <Link href="/shop" className="landing-nav-link py-4 text-[17px] mt-2" onClick={() => setOpen(false)}>
              Connexion
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
