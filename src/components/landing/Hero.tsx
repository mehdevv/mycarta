import { Link } from "wouter";
import {
  BarChart3,
  LayoutDashboard,
  QrCode,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-context";
import { LandingSectionLink } from "@/components/landing/LandingSectionLink";
import heroIllustration from "@/assets/hero-scan.png";

export function LandingHero() {
  const { t } = useLocale();

  const benefits: { icon: LucideIcon; label: string }[] = [
    { icon: QrCode, label: t("landing.hero.chipQr") },
    { icon: Users, label: t("landing.hero.chipCrm") },
    { icon: BarChart3, label: t("landing.hero.chipAnalytics") },
    { icon: ShieldCheck, label: t("landing.hero.chipAntiFraud") },
    { icon: LayoutDashboard, label: t("landing.hero.chipDashboard") },
  ];

  return (
    <section id="top" className="bg-white overflow-hidden landing-hero-section">
      <div className="container-page">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 sm:gap-10 lg:gap-16 items-center">
          <div className="landing-hero-copy">
            <h1 className="landing-h1 anim-in" style={{ animationDelay: "0ms" }}>
              {t("landing.hero.title")}
            </h1>

            <ul
              className="landing-hero-chips anim-in"
              style={{ animationDelay: "80ms" }}
              aria-label={t("landing.hero.chipsAria")}
            >
              {benefits.map((b) => {
                const Icon = b.icon;
                return (
                  <li key={b.label}>
                    <span className="landing-hero-chip">
                      <span className="landing-hero-chip-icon" aria-hidden>
                        <Icon size={15} strokeWidth={2.25} />
                      </span>
                      {b.label}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="landing-hero-cta anim-in" style={{ animationDelay: "120ms" }}>
              <Link href="/shop?tab=signup" className="btn-pill lg">
                {t("landing.hero.ctaStart")}
              </Link>
              <LandingSectionLink sectionId="how-it-works" className="btn-primary lg">
                {t("landing.hero.ctaHow")}
              </LandingSectionLink>
            </div>

            <p className="landing-hero-trust anim-in" style={{ animationDelay: "160ms" }}>
              <span>{t("landing.hero.trustTrial")}</span>
              <span>{t("landing.hero.trustNoCard")}</span>
              <span>{t("landing.hero.trustReady")}</span>
            </p>
          </div>

          <div
            className="anim-in landing-hero-visual"
            style={{ animationDelay: "100ms", animationDuration: "600ms" }}
          >
            <img
              src={heroIllustration}
              alt={t("landing.hero.imageAlt")}
              className="landing-hero-illustration"
              width={640}
              height={640}
              loading="eager"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
