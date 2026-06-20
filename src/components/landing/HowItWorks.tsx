import { Link } from "wouter";
import { useInView } from "@/hooks/use-in-view";
import { SectionHeader } from "./SectionHeader";
import { LandingMobileCarousel } from "./LandingMobileCarousel";
import step1Img from "@/assets/1.png";
import step2Img from "@/assets/2.png";
import step3Img from "@/assets/3.png";
import step4Img from "@/assets/4.png";

const steps = [
  {
    image: step1Img,
    imageAlt: "Client scannant un QR code avec son téléphone pour s'inscrire",
    title: "Le client scanne",
    body: "QR au comptoir. Nom et téléphone — carte créée en secondes, sans app.",
  },
  {
    image: step2Img,
    imageAlt: "Employé enregistrant un achat avec le terminal de scan",
    title: "L'équipe enregistre",
    body: "Scan de la carte, sélection des produits. Chaque vente est tracée.",
  },
  {
    image: step3Img,
    imageAlt: "Tampon ajouté sur la carte fidélité digitale du client",
    title: "Les tampons s'ajoutent",
    body: "À chaque visite, un tampon. La récompense se déclenche automatiquement.",
  },
  {
    image: step4Img,
    imageAlt: "Relance clients par WhatsApp et notifications",
    title: "Vous relancez",
    body: "WhatsApp ou email ciblés — par tampons, visite ou récompense en attente.",
  },
] as const;

export function LandingHowItWorks() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.1 });

  return (
    <section id="how-it-works" className="landing-section bg-white">
      <div className="container-page">
        <SectionHeader
          eyebrow="Comment ça marche"
          title="Quatre étapes. En ligne aujourd'hui."
          description="Pas de matériel spécial. Pas d'app store. Un QR imprimé et le téléphone de votre équipe."
        />

        <div ref={ref} className="relative">
          <div className="landing-step-line" aria-hidden />

          <LandingMobileCarousel
            ariaLabel="Étapes du programme fidélité"
            desktopClassName="landing-steps-grid relative z-[1]"
          >
            {steps.map((s, i) => (
              <article
                key={s.title}
                className={`landing-step-item reveal ${inView ? "is-visible" : ""}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="landing-step-card">
                  <div className="landing-step-visual">
                    <img
                      src={s.image}
                      alt={s.imageAlt}
                      className="landing-step-image"
                      width={480}
                      height={480}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="landing-step-content">
                    <span className="landing-step-badge" aria-hidden>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="landing-h3 mt-3">{s.title}</h3>
                    <p className="landing-body-sm mt-2 flex-1">{s.body}</p>
                  </div>
                </div>
              </article>
            ))}
          </LandingMobileCarousel>
        </div>

        <div className="landing-section-cta">
          <p className="landing-body max-w-md mx-auto">
            La plupart des commerces sont opérationnels en moins de 10 minutes.
          </p>
          <Link href="/shop?tab=signup" className="btn-pill lg">
            Configurer mon programme
          </Link>
        </div>
      </div>
    </section>
  );
}
