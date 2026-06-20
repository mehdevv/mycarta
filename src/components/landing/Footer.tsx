import { Link, useLocation, useSearch } from "wouter";
import BrandLogo from "@/components/brand/mascot";
import { usePlatformBranding } from "@/hooks/use-branding";
import { useLocale } from "@/lib/i18n/locale-context";
import { LANDING_FOOTER_PRODUCT_LINKS, LANDING_FOOTER_LEGAL_LINKS } from "./nav-links";
import { LandingSectionLink } from "./LandingSectionLink";
import footerCtaImg from "@/assets/1.png";

export function LandingFooter() {
  const platform = usePlatformBranding();
  const { t } = useLocale();
  const [location] = useLocation();
  const search = useSearch();
  const hideCta = location === "/shop" && new URLSearchParams(search).get("tab") === "signup";

  return (
    <footer style={{ background: "#000000" }} className="pt-12 pb-10">
      <div className="container-page">
        {!hideCta && (
          <div className="landing-footer-cta mb-14 !bg-white/5 !border-white/10">
            <div className="landing-footer-cta-main">
              <img
                src={footerCtaImg}
                alt=""
                className="landing-footer-cta-image"
                width={96}
                height={96}
                loading="lazy"
                decoding="async"
                aria-hidden
              />
              <div className="landing-footer-cta-copy">
                <p className="text-white font-medium text-[17px]">{t("landing.footer.notSignedUp")}</p>
                <p className="text-[14px] mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {t("landing.footer.trialDesc")}
                </p>
              </div>
            </div>
            <Link
              href="/shop?tab=signup"
              className="btn-pill shrink-0"
              style={{ background: "#fff", color: "#000" }}
            >
              {t("common.freeTrial")}
            </Link>
          </div>
        )}

        <div className="landing-footer-grid">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <BrandLogo
                role="admin"
                size="xs"
                animate={false}
                logoUrl={platform.logoDarkUrl}
                alt={platform.name}
                primaryColor="#888888"
              />
              <span className="text-white text-[15px] font-medium">{platform.name}</span>
            </Link>
            <p className="text-[14px] mt-3 leading-relaxed max-w-none sm:max-w-[220px]" style={{ color: "rgba(255,255,255,0.55)" }}>
              {platform.tagline}
            </p>
            <a
              href={`mailto:${platform.supportEmail}`}
              className="text-[14px] mt-4 inline-block hover:text-white transition-colors underline-offset-2 hover:underline email"
              style={{ color: "rgba(255,255,255,0.75)" }}
              dir="ltr"
            >
              {platform.supportEmail}
            </a>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
              {t("landing.footer.product")}
            </p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {LANDING_FOOTER_PRODUCT_LINKS.map((l) => (
                <li key={l.sectionId}>
                  <LandingSectionLink
                    sectionId={l.sectionId}
                    className="text-[14px] hover:text-white transition-colors py-0.5 inline-block"
                    style={{ color: "rgba(255,255,255,0.65)" }}
                  >
                    {t(l.labelKey)}
                  </LandingSectionLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
              {t("landing.footer.account")}
            </p>
            <ul className="mt-4 flex flex-col gap-2.5">
              <li>
                <Link href="/shop?tab=signup" className="text-[14px] hover:text-white transition-colors py-0.5 inline-block" style={{ color: "rgba(255,255,255,0.65)" }}>
                  {t("common.freeTrial")}
                </Link>
              </li>
              <li>
                <Link href="/shop" className="text-[14px] hover:text-white transition-colors py-0.5 inline-block" style={{ color: "rgba(255,255,255,0.65)" }}>
                  {t("common.login")}
                </Link>
              </li>
              <li>
                <Link href="/client" className="text-[14px] hover:text-white transition-colors py-0.5 inline-block" style={{ color: "rgba(255,255,255,0.65)" }}>
                  {t("nav.findShop")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
              {t("landing.footer.legal")}
            </p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {LANDING_FOOTER_LEGAL_LINKS.map((l) => (
                <li key={l.slug}>
                  <Link
                    href={`/legal/${l.slug}`}
                    className="text-[14px] hover:text-white transition-colors py-0.5 inline-block"
                    style={{ color: "rgba(255,255,255,0.65)" }}
                  >
                    {t(l.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            {t("landing.footer.copyright", { name: platform.name })}
          </p>
          <Link href="/" className="text-[13px] hover:text-white transition-colors" style={{ color: "rgba(255,255,255,0.5)" }}>
            {t("common.backToHome")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
