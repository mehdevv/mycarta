import { Link } from "wouter";
import { Lock, Shield, CheckSquare, RefreshCw, type LucideIcon } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { LandingMobileCarousel } from "./LandingMobileCarousel";

const items: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Lock, title: "Chiffrement AES-256", body: "Données sensibles chiffrées au repos, en transit et en sauvegarde." },
  { icon: Shield, title: "Isolation multi-tenant", body: "Chaque commerce est isolé — vos données ne se mélangent jamais." },
  { icon: CheckSquare, title: "Conforme RGPD", body: "Consentement, export et suppression des données — intégrés." },
  { icon: RefreshCw, title: "Sauvegardes quotidiennes", body: "Récupération point-in-time sur tous les plans payants." },
];

export function LandingSecurity() {
  return (
    <section id="security" className="landing-section" style={{ background: "var(--landing-bg-dark)" }}>
      <div className="container-page">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8 sm:gap-10 lg:gap-16 items-start">
          <div className="lg:sticky lg:top-[calc(var(--landing-nav-h)+32px)]">
            <SectionHeader
              eyebrow="Sécurité"
              title="Vos données vous appartiennent"
              description="Standards de niveau financier : chiffrement, isolation par commerce, conformité RGPD."
              align="left"
              className="!mb-8 [&_.landing-body]:text-white/65 [&_.landing-eyebrow]:text-white/50 [&_.landing-h2]:text-white"
            />
            <Link href="/shop?tab=signup" className="btn-pill w-full sm:w-auto justify-center">
              Essayer en toute confiance
            </Link>
          </div>

          <LandingMobileCarousel
            ariaLabel="Mesures de sécurité"
            desktopClassName="landing-security-grid"
            className="landing-carousel--dark"
          >
            {items.map((it) => {
              const Icon = it.icon;
              return (
                <article
                  key={it.title}
                  className="p-6 rounded-[var(--landing-radius-card-lg)] h-full"
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
