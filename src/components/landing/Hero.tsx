import { Link } from "wouter";
import {
  BarChart3,
  LayoutDashboard,
  QrCode,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import heroIllustration from "@/assets/hero-scan.png";

const benefits: { icon: LucideIcon; label: string }[] = [
  { icon: QrCode, label: "QR sans app" },
  { icon: Users, label: "CRM intégré" },
  { icon: BarChart3, label: "Analytics" },
  { icon: ShieldCheck, label: "Anti-fraude" },
  { icon: LayoutDashboard, label: "Tableau de bord" },
];

export function LandingHero() {
  return (
    <section
      id="top"
      className="bg-white overflow-hidden landing-hero-section"
    >
      <div className="container-page">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 sm:gap-10 lg:gap-16 items-center">
          <div className="landing-hero-copy">
            <h1 className="landing-h1 anim-in" style={{ animationDelay: "0ms" }}>
              Fidélisez vos clients sans carte papier
            </h1>

            <ul
              className="landing-hero-chips anim-in"
              style={{ animationDelay: "80ms" }}
              aria-label="Fonctionnalités clés"
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
                Commencer gratuitement
              </Link>
              <a href="#how-it-works" className="btn-primary lg">
                Voir comment ça marche
              </a>
            </div>

            <p className="landing-hero-trust anim-in" style={{ animationDelay: "160ms" }}>
              <span>14 jours gratuits</span>
              <span>Sans carte bancaire</span>
              <span>Prêt en 10 min</span>
            </p>
          </div>

          <div
            className="anim-in landing-hero-visual"
            style={{ animationDelay: "100ms", animationDuration: "600ms" }}
          >
            <img
              src={heroIllustration}
              alt="Client scannant un QR code fidélité au comptoir d'un café"
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
