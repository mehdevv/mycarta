import { Clock, CreditCard, Sparkles, Unlock, type LucideIcon } from "lucide-react";
import { Link } from "wouter";

const perks: { icon: LucideIcon; label: string }[] = [
  { icon: CreditCard, label: "Sans carte bancaire" },
  { icon: Clock, label: "En ligne en 10 min" },
  { icon: Unlock, label: "Résiliation libre" },
];

export function LandingFinalCTA() {
  return (
    <section className="landing-section bg-white">
      <div className="container-page max-w-[900px]">
        <div className="landing-cta-band">
          <div className="landing-cta-icon-badge" aria-hidden>
            <Sparkles size={26} strokeWidth={1.75} />
          </div>

          <h2 className="landing-h2 max-w-lg mx-auto">
            Prêt à connaître vos clients ?
          </h2>
          <p className="landing-body mt-4 max-w-md mx-auto">
            Configurez votre programme en 10 minutes. Essai 14 jours — 100 clients, 50 scans/jour.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/shop?tab=signup" className="btn-pill btn-pill--on-dark lg w-full sm:w-auto justify-center">
              Créer mon compte gratuit
            </Link>
          </div>

          <div className="landing-cta-perks" role="list" aria-label="Avantages de l'essai gratuit">
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
