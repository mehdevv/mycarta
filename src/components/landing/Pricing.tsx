import { useState } from "react";
import { Link } from "wouter";
import { Check } from "lucide-react";
import { ANNUAL_BILLING_NOTE, formatDzd, getPlan, PLANS } from "@/lib/pricing";
import { SectionHeader } from "./SectionHeader";
import { LandingMobileCarousel } from "./LandingMobileCarousel";
import { usePlatformBranding } from "@/hooks/use-branding";

const paidPlans = PLANS.filter((p) => p.id !== "trial");

function planFeatureList(planId: string): string[] {
  const plan = getPlan(planId);
  return [
    `${plan.clientLimitLabel} clients fidélité`,
    `${plan.workerLimitLabel} workers (scan QR)`,
    `${plan.campaignLabel} campagnes`,
    `${plan.locationLabel} localisation(s)`,
    `Carte : ${plan.cardDesign}`,
    plan.capabilities.whatsapp ? "Campagnes WhatsApp Business" : "Campagnes email",
    plan.capabilities.apiAccess ? "Accès API complet" : null,
    `Support ${plan.support} (${plan.supportResponse})`,
    "QR code · scan worker · CRM · analytics",
    "Prévention fraude · export CSV · white-label",
  ].filter(Boolean) as string[];
}

export function LandingPricing() {
  const [annual, setAnnual] = useState(false);
  const platform = usePlatformBranding();

  return (
    <section id="pricing" className="landing-section bg-white">
      <div className="container-page">
        <SectionHeader
          eyebrow="Tarifs"
          title="Grille tarifaire officielle — Dinars Algériens"
          description="14 jours d'essai gratuit sans carte bancaire. Paiement Chargily ou virement BaridiMob."
          className="landing-section-header--wide"
        />

        <div className="landing-pricing-toggle-wrap">
          <div className="landing-toggle" role="group" aria-label="Période de facturation">
            <button
              type="button"
              className={`landing-toggle-btn ${!annual ? "is-active" : ""}`}
              onClick={() => setAnnual(false)}
            >
              Mensuel
            </button>
            <button
              type="button"
              className={`landing-toggle-btn ${annual ? "is-active" : ""}`}
              onClick={() => setAnnual(true)}
            >
              Annuel <span className="opacity-70">2 mois offerts</span>
            </button>
          </div>

          <div className="chip">
            Essai gratuit 14 jours · sans engagement · {ANNUAL_BILLING_NOTE}
          </div>
        </div>

        <LandingMobileCarousel
          ariaLabel="Plans tarifaires"
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
                    Recommandé
                  </p>
                )}

                <h3 className="landing-h3">
                  {plan.emoji} {plan.name}
                </h3>

                <div className="mt-4 flex items-baseline gap-1.5">
                  <span
                    className="landing-pricing-price font-normal text-[var(--landing-text)] tracking-tight"
                    style={{ fontSize: price === null ? "1.75rem" : "2.5rem", lineHeight: 1 }}
                  >
                    {formatDzd(price)}
                  </span>
                  {price !== null && price > 0 && (
                    <span className="text-[15px] text-[var(--landing-text-secondary)]">
                      {annual ? "/ an" : "/ mois"}
                    </span>
                  )}
                </div>

                {annual && plan.annualSavingsDzd ? (
                  <p className="text-xs text-emerald-700 font-medium mt-1">
                    Économie {formatDzd(plan.annualSavingsDzd)} / an
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
                      Demander un devis
                    </a>
                  ) : (
                    <Link
                      href={`/shop?tab=signup&plan=${plan.id}`}
                      className={`${featured ? "btn-pill" : "btn-primary"} w-full justify-center`}
                    >
                      Essai gratuit 14 jours
                    </Link>
                  )}
                  <p className="landing-trust-line text-center">Sans carte bancaire</p>
                </div>
              </article>
            );
          })}
        </LandingMobileCarousel>
      </div>
    </section>
  );
}
