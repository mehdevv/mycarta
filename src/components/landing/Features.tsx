import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Check } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { FeatureMockup } from "./mockups/FeatureMockup";
import { SectionHeader } from "./SectionHeader";
import { LandingMobileCarousel } from "./LandingMobileCarousel";

const features = [
  {
    eyebrow: "CRM & Contacts",
    headline: "Connaissez chaque client par son nom.",
    body: "Chaque scan devient un contact : nom, téléphone, historique — capturés automatiquement.",
    bullets: ["Profil + historique des scans", "Notes privées", "RGPD intégré", "Export CSV"],
  },
  {
    eyebrow: "Analytics",
    headline: "Voyez ce qui fonctionne vraiment.",
    body: "Produits qui fidélisent, clients proches d'une récompense, performance employés — sans tableur.",
    bullets: ["Dashboards 30 / 90 / 365 j", "Suivi produits", "Classement employés", "Alertes fraude"],
  },
  {
    eyebrow: "Campagnes",
    headline: "Contactez vos clients directement.",
    body: "WhatsApp ou email en un clic. Filtrez par tampons, dernière visite ou récompense en attente.",
    bullets: ["WhatsApp (plan Maison+)", "Email domaine perso", "Segmentation", "Planification"],
  },
  {
    eyebrow: "App Employé",
    headline: "Chaque achat tracé.",
    body: "QR unique par employé. Chaque tampon lié à un produit et un horaire — fraude bloquée.",
    bullets: ["Journal par employé", "Règles anti-fraude", "Classement du jour", "Désactivation rapide"],
  },
  {
    eyebrow: "Votre marque",
    headline: "White-label total.",
    body: "Logo, couleurs, slug public — vos clients ne voient que votre marque.",
    bullets: ["Carte personnalisable", "Couleurs de marque", "URL /{boutique}", "Email expéditeur"],
  },
];

function useFeatureScrollSpy(sectionRefs: React.MutableRefObject<(HTMLElement | null)[]>) {
  const [active, setActive] = useState(0);

  const updateActive = useCallback(() => {
    const sections = sectionRefs.current.filter(Boolean) as HTMLElement[];
    if (!sections.length) return;

    const viewportCenter = window.innerHeight * 0.42;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    sections.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      const sectionCenter = rect.top + rect.height * 0.35;
      const distance = Math.abs(sectionCenter - viewportCenter);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    });

    setActive((prev) => (prev === bestIndex ? prev : bestIndex));
  }, [sectionRefs]);

  useEffect(() => {
    updateActive();
    window.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateActive);
      window.removeEventListener("resize", updateActive);
    };
  }, [updateActive]);

  return active;
}

export function LandingFeatures() {
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const active = useFeatureScrollSpy(sectionRefs);
  const reduceMotion = useReducedMotion();

  const scrollToFeature = (i: number) => {
    sectionRefs.current[i]?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "center",
    });
  };

  return (
    <section id="features" className="landing-section landing-features-section">
      <div className="container-page">
        <SectionHeader
          eyebrow="Fonctionnalités"
          title="Tout ce qu'il faut pour fidéliser"
          description="Les mêmes outils que votre tableau de bord — CRM, analytics, campagnes et anti-fraude."
          className="landing-section-header--wide"
        />

        {/* Desktop — scroll-linked sticky showcase */}
        <div className="landing-features-showcase hidden lg:grid">
          <div className="landing-features-scroll-col">
            <nav className="landing-features-rail" aria-label="Progression des fonctionnalités">
              {features.map((f, i) => (
                <button
                  key={f.eyebrow}
                  type="button"
                  className={`landing-features-rail-dot ${i <= active ? "is-reached" : ""} ${active === i ? "is-active" : ""}`}
                  aria-label={`${f.eyebrow} — ${f.headline}`}
                  aria-current={active === i ? "step" : undefined}
                  onClick={() => scrollToFeature(i)}
                />
              ))}
              <span
                className="landing-features-rail-track"
                style={{ height: `${(active / Math.max(features.length - 1, 1)) * 100}%` }}
                aria-hidden
              />
            </nav>

            <div className="landing-features-panels">
              {features.map((f, i) => {
                const state = active === i ? "active" : active > i ? "past" : "upcoming";
                return (
                  <article
                    key={f.headline}
                    ref={(el) => {
                      sectionRefs.current[i] = el;
                    }}
                    className={`landing-feature-panel landing-feature-panel--${state}`}
                    id={`feature-panel-${i}`}
                  >
                    <button
                      type="button"
                      className="landing-feature-panel-hit"
                      onClick={() => scrollToFeature(i)}
                      aria-label={`Aller à ${f.eyebrow}`}
                    />
                    <p className="landing-eyebrow">{f.eyebrow}</p>
                    <h3 className="landing-feature-panel-title">{f.headline}</h3>
                    <p className="landing-body landing-feature-panel-body">{f.body}</p>
                    <ul className="landing-feature-panel-bullets">
                      {f.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2.5 landing-body-sm text-[var(--landing-text)]">
                          <Check size={16} className="landing-check mt-0.5 shrink-0" strokeWidth={2} />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="landing-features-sticky">
            <div className="landing-features-sticky-inner">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  className="landing-features-mockup-wrap"
                  initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <FeatureMockup screen={active} />
                </motion.div>
              </AnimatePresence>

              <div className="landing-features-meta">
                <div className="landing-features-dots" role="tablist" aria-label="Aperçu des fonctionnalités">
                  {features.map((f, i) => (
                    <button
                      key={f.eyebrow}
                      type="button"
                      role="tab"
                      aria-selected={active === i}
                      className={`landing-features-dot ${active === i ? "is-active" : ""}`}
                      onClick={() => scrollToFeature(i)}
                      aria-label={f.eyebrow}
                    />
                  ))}
                </div>
                <p className="landing-body-sm landing-features-caption">
                  <span className="landing-features-caption-num">
                    {String(active + 1).padStart(2, "0")}
                  </span>
                  <span className="landing-features-caption-sep">/</span>
                  <span>{String(features.length).padStart(2, "0")}</span>
                  <span className="landing-features-caption-label"> — {features[active].eyebrow}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile / tablet — swipe carousel */}
        <div className="landing-features-mobile lg:hidden">
          <LandingMobileCarousel
            ariaLabel="Fonctionnalités de la plateforme"
            desktopClassName="landing-features-carousel"
            minWidth="lg"
          >
            {features.map((f, i) => (
              <article key={f.headline} className="landing-card landing-feature-mobile-card">
                <div className="landing-feature-mobile-head">
                  <span className="landing-feature-mobile-index">{String(i + 1).padStart(2, "0")}</span>
                  <p className="landing-eyebrow">{f.eyebrow}</p>
                </div>
                <h3 className="landing-h2 mt-2 text-[1.375rem]">{f.headline}</h3>
                <p className="landing-body mt-3">{f.body}</p>
                <ul className="mt-4 flex flex-col gap-2">
                  {f.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 landing-body-sm">
                      <Check size={16} className="landing-check mt-0.5 shrink-0" strokeWidth={2} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 landing-feature-mobile-mockup">
                  <FeatureMockup screen={i} />
                </div>
              </article>
            ))}
          </LandingMobileCarousel>
        </div>

        <div className="landing-section-cta">
          <Link href="/shop?tab=signup" className="btn-pill lg">
            Essayer toutes les fonctionnalités
          </Link>
        </div>
      </div>
    </section>
  );
}
