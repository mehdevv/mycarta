import { useState } from "react";
import { Link } from "wouter";
import { Check } from "lucide-react";
import { ANNUAL_BILLING_NOTE, formatDzd, getPlan, PLANS } from "@/lib/pricing";
import { useLocale } from "@/lib/i18n/locale-context";
import { SectionHeader } from "./SectionHeader";
import { LandingMobileCarousel } from "./LandingMobileCarousel";
import { usePlatformBranding } from "@/hooks/use-branding";

const paidPlans = PLANS.filter((p) => p.id !== "trial");

export function LandingPricing() {
  const [annual, setAnnual] = useState(false);
  const platform = usePlatformBranding();
  const { t } = useLocale();

  function planFeatureList(planId: string): string[] {
    const plan = getPlan(planId);
    return [
      t("landing.pricing.featureClients", { count: plan.clientLimitLabel }),
      t("landing.pricing.featureWorkers", { count: plan.workerLimitLabel }),
      t("landing.pricing.featureCampaigns", { count: plan.campaignLabel }),
      t("landing.pricing.featureLocations", { count: plan.locationLabel }),
      t("landing.pricing.featureCard", { design: plan.cardDesign }),
      plan.capabilities.whatsapp ? t("landing.pricing.featureWhatsapp") : t("landing.pricing.featureEmail"),
      plan.capabilities.apiAccess ? t("landing.pricing.featureApi") : null,
      t("landing.pricing.featureSupport", { level: plan.support, response: plan.supportResponse }),
      t("landing.pricing.featureCore"),
      t("landing.pricing.featureExtras"),
    ].filter(Boolean) as string[];
  }

  function planName(planId: string) {
    const key = `plans.${planId}` as const;
    const translated = t(key);
    return translated !== key ? translated : getPlan(planId).name;
  }

  return (
    <section id="pricing" className="landing-section bg-white">
      <div className="container-page">
        <SectionHeader
          eyebrow={t("landing.pricing.eyebrow")}
          title={t("landing.pricing.title")}
          description={t("landing.pricing.description")}
          className="landing-section-header--wide"
        />

        <div className="landing-pricing-toggle-wrap">
          <div className="landing-toggle" role="group" aria-label={t("landing.pricing.billingAria")}>
            <button
              type="button"
              className={`landing-toggle-btn ${!annual ? "is-active" : ""}`}
              onClick={() => setAnnual(false)}
            >
              {t("landing.pricing.monthly")}
            </button>
            <button
              type="button"
              className={`landing-toggle-btn ${annual ? "is-active" : ""}`}
              onClick={() => setAnnual(true)}
            >
              {t("landing.pricing.annual")} <span className="opacity-70">{t("landing.pricing.annualBonus")}</span>
            </button>
          </div>

          <div className="chip">
            {t("landing.pricing.chip", { note: ANNUAL_BILLING_NOTE })}
          </div>
        </div>

        <LandingMobileCarousel
          ariaLabel={t("landing.pricing.carouselAria")}
          desktopClassName="landing-pricing-grid"
          minWidth="md"
        >
          {paidPlans.map((plan) => {
            const price = annual ? plan.annualDzd : plan.monthlyDzd;
            const featured = plan.id === "maison";
            const features = planFeatureList(plan.id);

            return (
              <article
                key={plan.id}
                className={`landing-card flex flex-col h-full ${featured ? "landing-pricing-card--featured" : "landing-card-interactive"}`}
              >
                {featured && (
                  <p className="text-[12px] font-medium uppercase tracking-wide text-[var(--landing-text-secondary)] mb-3">
                    {t("landing.pricing.recommended")}
                  </p>
                )}

                <h3 className="landing-h3">
                  {plan.emoji} {planName(plan.id)}
                </h3>

                <div className="mt-4 flex items-baseline gap-1.5">
                  <span
                    className="landing-pricing-price font-normal text-[var(--landing-text)] tracking-tight"
                    style={{ fontSize: price === null ? "1.75rem" : "2.5rem", lineHeight: 1 }}
                  >
                    {formatDzd(price, t("landing.pricing.customQuote"))}
                  </span>
                  {price !== null && price > 0 && (
                    <span className="text-[15px] text-[var(--landing-text-secondary)]">
                      {annual ? t("landing.pricing.perYear") : t("landing.pricing.perMonth")}
                    </span>
                  )}
                </div>

                {annual && plan.annualSavingsDzd ? (
                  <p className="text-xs text-emerald-700 font-medium mt-1">
                    {t("landing.pricing.savingsYear", { amount: formatDzd(plan.annualSavingsDzd) })}
                  </p>
                ) : null}

                <p className="landing-body-sm mt-2">{plan.description}</p>

                <hr className="my-6 border-[var(--landing-border)]" />

                <ul className="flex flex-col gap-3 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 landing-body-sm text-[var(--landing-text)]">
                      <Check size={16} className="landing-check mt-0.5 shrink-0" strokeWidth={2} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 pt-2">
                  {plan.id === "prestige" ? (
                    <a
                      href={`mailto:${platform.supportEmail}?subject=Plan%20Prestige%20LoyalQR`}
                      className="btn-primary w-full justify-center"
                    >
                      {t("landing.pricing.requestQuote")}
                    </a>
                  ) : (
                    <Link
                      href={`/shop?tab=signup&plan=${plan.id}`}
                      className={`${featured ? "btn-pill" : "btn-primary"} w-full justify-center`}
                    >
                      {t("landing.pricing.trialCta")}
                    </Link>
                  )}
                  <p className="landing-trust-line text-center">{t("landing.pricing.noCardLine")}</p>
                </div>
              </article>
            );
          })}
        </LandingMobileCarousel>
      </div>
    </section>
  );
}
