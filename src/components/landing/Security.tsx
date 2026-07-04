import { Link } from "wouter";
import { Lock, Shield, CheckSquare, RefreshCw, type LucideIcon } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-context";
import { SectionHeader } from "./SectionHeader";
import { LandingMobileCarousel } from "./LandingMobileCarousel";

export function LandingSecurity() {
  const { t } = useLocale();

  const items: { icon: LucideIcon; title: string; body: string }[] = [
    { icon: Lock, title: t("landing.security.card1Title"), body: t("landing.security.card1Body") },
    { icon: Shield, title: t("landing.security.card2Title"), body: t("landing.security.card2Body") },
    { icon: CheckSquare, title: t("landing.security.card3Title"), body: t("landing.security.card3Body") },
    { icon: RefreshCw, title: t("landing.security.card4Title"), body: t("landing.security.card4Body") },
  ];

  return (
    <section id="security" className="landing-section landing-security-section" style={{ background: "var(--landing-bg-dark)" }}>
      <div className="container-page">
        <div className="landing-security-layout grid lg:grid-cols-[0.9fr_1.1fr] gap-8 sm:gap-10 lg:gap-16 items-start min-w-0 w-full">
          <div className="landing-security-intro min-w-0 w-full max-w-full lg:sticky lg:top-[calc(var(--landing-nav-h)+32px)]">
            <SectionHeader
              eyebrow={t("landing.security.eyebrow")}
              title={t("landing.security.title")}
              description={t("landing.security.description")}
              align="left"
              className="!mb-8 [&_.landing-body]:text-white/65 [&_.landing-eyebrow]:text-white/50 [&_.landing-h2]:text-white"
            />
            <Link href="/shop?tab=signup" className="btn-pill landing-security-cta w-full sm:w-auto justify-center">
              {t("landing.security.cta")}
            </Link>
          </div>

          <LandingMobileCarousel
            ariaLabel={t("landing.security.carouselAria")}
            desktopClassName="landing-security-grid"
            className="landing-carousel--dark"
          >
            {items.map((it) => {
              const Icon = it.icon;
              return (
                <article
                  key={it.title}
                  className="landing-security-card p-5 sm:p-6 rounded-[var(--landing-radius-card-lg)] h-full"
                  style={{
                    background: "var(--landing-bg-dark-elevated)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    className="inline-flex p-3 rounded-full"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <Icon size={20} color="rgba(255,255,255,0.9)" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-white text-[16px] font-medium mt-4">{it.title}</h3>
                  <p className="text-[14px] mt-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                    {it.body}
                  </p>
                </article>
              );
            })}
          </LandingMobileCarousel>
        </div>
      </div>
    </section>
  );
}
