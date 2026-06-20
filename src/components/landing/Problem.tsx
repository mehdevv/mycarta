import { ArrowRight, FileX, UserX, AlertTriangle, BellOff, type LucideIcon } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { LandingMobileCarousel } from "./LandingMobileCarousel";
import { usePlatformBranding } from "@/hooks/use-branding";

const items: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: FileX,
    title: "Les cartes se perdent",
    body: "Le client perd sa carte et ne revient pas. Aucun moyen de le recontacter.",
  },
  {
    icon: UserX,
    title: "Zéro donnée client",
    body: "Pas de noms, pas de téléphones — vous servez des inconnus chaque jour.",
  },
  {
    icon: AlertTriangle,
    title: "La fraude est facile",
    body: "N'importe qui peut tamponner sa carte. La fidélité récompense les mauvais acteurs.",
  },
  {
    icon: BellOff,
    title: "Impossible de relancer",
    body: "Nouveau menu ou promo ? Vos meilleurs clients ne le sauront jamais.",
  },
];

export function LandingProblem() {
  const platform = usePlatformBranding();
  return (
    <section
      className="landing-section landing-section-curve-top"
      style={{ background: "var(--landing-bg-secondary)" }}
    >
      <div className="container-page">
        <SectionHeader
          eyebrow="Le problème"
          title="La fidélité papier vous fait perdre de l'argent"
          description="Chaque carte perdue, c'est un client que vous ne reverrez peut-être jamais — et aucune donnée pour le ramener."
          className="landing-section-header--wide"
        />

        <LandingMobileCarousel
          ariaLabel="Problèmes de la fidélité papier"
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
            {platform.name} remplace tout ça par une carte digitale, un CRM et des relances automatiques.
          </p>
          <a href="#how-it-works" className="btn-ghost inline-flex mt-4 text-[17px] gap-2">
            Découvrir la solution <ArrowRight size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}
