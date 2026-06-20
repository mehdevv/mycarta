import { Link } from "wouter";
import { useInView } from "@/hooks/use-in-view";
import { useLocale } from "@/lib/i18n/locale-context";
import { SectionHeader } from "./SectionHeader";
import { LandingMobileCarousel } from "./LandingMobileCarousel";
import step1Img from "@/assets/1.png";
import step2Img from "@/assets/2.png";
import step3Img from "@/assets/3.png";
import step4Img from "@/assets/4.png";

export function LandingHowItWorks() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.1 });
  const { t } = useLocale();

  const steps = [
    {
      image: step1Img,
      imageAlt: t("landing.howItWorks.step1Alt"),
      title: t("landing.howItWorks.step1Title"),
      body: t("landing.howItWorks.step1Body"),
    },
    {
      image: step2Img,
      imageAlt: t("landing.howItWorks.step2Alt"),
      title: t("landing.howItWorks.step2Title"),
      body: t("landing.howItWorks.step2Body"),
    },
    {
      image: step3Img,
      imageAlt: t("landing.howItWorks.step3Alt"),
      title: t("landing.howItWorks.step3Title"),
      body: t("landing.howItWorks.step3Body"),
    },
    {
      image: step4Img,
      imageAlt: t("landing.howItWorks.step4Alt"),
      title: t("landing.howItWorks.step4Title"),
      body: t("landing.howItWorks.step4Body"),
    },
  ] as const;

  return (
    <section id="how-it-works" className="landing-section bg-white">
      <div className="container-page">
        <SectionHeader
          eyebrow={t("landing.howItWorks.eyebrow")}
          title={t("landing.howItWorks.title")}
          description={t("landing.howItWorks.description")}
        />

        <div ref={ref} className="relative">
          <div className="landing-step-line" aria-hidden />

          <LandingMobileCarousel
            ariaLabel={t("landing.howItWorks.carouselAria")}
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
          <p className="landing-body max-w-md mx-auto">{t("landing.howItWorks.closing")}</p>
          <Link href="/shop?tab=signup" className="btn-pill lg">
            {t("landing.howItWorks.cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
