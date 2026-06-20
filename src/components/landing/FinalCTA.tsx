import { Clock, CreditCard, Sparkles, Unlock, type LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { useLocale } from "@/lib/i18n/locale-context";

export function LandingFinalCTA() {
  const { t } = useLocale();

  const perks: { icon: LucideIcon; label: string }[] = [
    { icon: CreditCard, label: t("landing.finalCta.perkNoCard") },
    { icon: Clock, label: t("landing.finalCta.perkFast") },
    { icon: Unlock, label: t("landing.finalCta.perkCancel") },
  ];

  return (
    <section className="landing-section bg-white">
      <div className="container-page max-w-[900px]">
        <div className="landing-cta-band">
          <div className="landing-cta-icon-badge" aria-hidden>
            <Sparkles size={26} strokeWidth={1.75} />
          </div>

          <h2 className="landing-h2 max-w-lg mx-auto">{t("landing.finalCta.title")}</h2>
          <p className="landing-body mt-4 max-w-md mx-auto">{t("landing.finalCta.description")}</p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/shop?tab=signup" className="btn-pill btn-pill--on-dark lg w-full sm:w-auto justify-center">
              {t("landing.finalCta.cta")}
            </Link>
          </div>

          <div className="landing-cta-perks" role="list" aria-label={t("landing.finalCta.perksAria")}>
            {perks.map((p) => {
              const Icon = p.icon;
              return (
                <span key={p.label} className="landing-cta-perk" role="listitem">
                  <span className="landing-cta-perk-icon" aria-hidden>
                    <Icon size={15} strokeWidth={2.25} />
                  </span>
                  {p.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
