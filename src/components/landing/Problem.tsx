import { ArrowRight, FileX, UserX, AlertTriangle, BellOff, type LucideIcon } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { LandingMobileCarousel } from "./LandingMobileCarousel";
import { usePlatformBranding } from "@/hooks/use-branding";
import { useLocale } from "@/lib/i18n/locale-context";
import { LandingSectionLink } from "./LandingSectionLink";

export function LandingProblem() {
  const platform = usePlatformBranding();
  const { t } = useLocale();

  const items: { icon: LucideIcon; title: string; body: string }[] = [
    { icon: FileX, title: t("landing.problem.card1Title"), body: t("landing.problem.card1Body") },
    { icon: UserX, title: t("landing.problem.card2Title"), body: t("landing.problem.card2Body") },
    { icon: AlertTriangle, title: t("landing.problem.card3Title"), body: t("landing.problem.card3Body") },
    { icon: BellOff, title: t("landing.problem.card4Title"), body: t("landing.problem.card4Body") },
  ];

  return (
    <section
      className="landing-section landing-section-curve-top"
      style={{ background: "var(--landing-bg-secondary)" }}
    >
      <div className="container-page">
        <SectionHeader
          eyebrow={t("landing.problem.eyebrow")}
          title={t("landing.problem.title")}
          description={t("landing.problem.description")}
          className="landing-section-header--wide"
        />

        <LandingMobileCarousel
          ariaLabel={t("landing.problem.carouselAria")}
          desktopClassName="landing-problem-grid"
        >
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <article key={it.title} className="landing-card landing-card-interactive h-full flex flex-col">
                <span
                  className="text-[12px] font-medium text-[var(--landing-text-secondary)]"
                  aria-hidden
                >
                  0{i + 1}
                </span>
                <div
                  className="inline-flex p-3 rounded-[var(--landing-radius-sm)] mt-3 w-fit"
                  style={{ background: "var(--landing-bg-secondary)" }}
                >
                  <Icon size={20} color="var(--landing-text)" strokeWidth={1.5} />
                </div>
                <h3 className="landing-h3 mt-4">{it.title}</h3>
                <p className="landing-body-sm mt-2 flex-1">{it.body}</p>
              </article>
            );
          })}
        </LandingMobileCarousel>

        <div className="mt-12 landing-problem-closing text-center">
          <p className="landing-body max-w-lg mx-auto">
            {t("landing.problem.closing", { name: platform.name })}
          </p>
          <LandingSectionLink sectionId="how-it-works" className="btn-ghost inline-flex mt-4 text-[17px] gap-2">
            {t("landing.problem.cta")} <ArrowRight size={18} className="icon-mirror-rtl" />
          </LandingSectionLink>
        </div>
      </div>
    </section>
  );
}
