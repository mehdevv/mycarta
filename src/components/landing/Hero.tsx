import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "wouter";
import {
  BarChart3,
  LayoutDashboard,
  QrCode,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-context";
import { LandingSectionLink } from "@/components/landing/LandingSectionLink";
import heroIllustration from "@/assets/hero-scan.png";
import heroScanPay from "@/assets/hero-scan-pay.png";

const HERO_IMAGE_INTERVAL_MS = 5000;
const HERO_IMAGE_FADE_MS = 900;

function HeroImageCrossfade({
  images,
}: {
  images: { src: string; alt: string }[];
}) {
  const { t } = useLocale();
  const [activeIndex, setActiveIndex] = useState(0);
  const [motionEnabled, setMotionEnabled] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotionEnabled(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!motionEnabled || images.length < 2) return;
    const id = window.setTimeout(() => {
      setActiveIndex((i) => (i + 1) % images.length);
    }, HERO_IMAGE_INTERVAL_MS);
    return () => window.clearTimeout(id);
  }, [activeIndex, images.length, motionEnabled]);

  const frameStyle = {
    "--hero-image-fade-ms": `${HERO_IMAGE_FADE_MS}ms`,
    "--hero-image-interval-ms": `${HERO_IMAGE_INTERVAL_MS}ms`,
  } as CSSProperties;

  return (
    <div className="landing-hero-illustration-frame" style={frameStyle}>
      <div className="landing-hero-illustration-stack">
        {images.map((image, index) => (
          <img
            key={image.src}
            src={image.src}
            alt={image.alt}
            className={`landing-hero-illustration${index === activeIndex ? " is-visible" : ""}`}
            width={640}
            height={640}
            loading={index === 0 ? "eager" : "lazy"}
            decoding="async"
            aria-hidden={index !== activeIndex}
          />
        ))}
      </div>

      {motionEnabled && images.length > 1 && (
        <div
          className="landing-hero-loader"
          role="tablist"
          aria-label={t("landing.hero.imageLoaderAria")}
        >
          {images.map((image, index) => {
            const state =
              index < activeIndex ? "complete" : index === activeIndex ? "active" : "idle";
            return (
              <button
                key={image.src}
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                aria-label={image.alt}
                className={`landing-hero-loader-segment is-${state}`}
                onClick={() => setActiveIndex(index)}
              >
                <span
                  key={state === "active" ? `fill-${activeIndex}` : `fill-${index}`}
                  className="landing-hero-loader-fill"
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function LandingHero() {
  const { t } = useLocale();

  const benefits: { icon: LucideIcon; label: string }[] = [
    { icon: QrCode, label: t("landing.hero.chipQr") },
    { icon: Users, label: t("landing.hero.chipCrm") },
    { icon: BarChart3, label: t("landing.hero.chipAnalytics") },
    { icon: ShieldCheck, label: t("landing.hero.chipAntiFraud") },
    { icon: LayoutDashboard, label: t("landing.hero.chipDashboard") },
  ];

  const heroImages = [
    { src: heroIllustration, alt: t("landing.hero.imageAlt") },
    { src: heroScanPay, alt: t("landing.hero.imageAltPay") },
  ];

  return (
    <section id="top" className="bg-white overflow-hidden landing-hero-section">
      <div className="container-page">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 sm:gap-10 lg:gap-16 items-center">
          <div className="landing-hero-copy">
            <h1 className="landing-h1 anim-in" style={{ animationDelay: "0ms" }}>
              {t("landing.hero.title")}
            </h1>

            <ul
              className="landing-hero-chips anim-in"
              style={{ animationDelay: "80ms" }}
              aria-label={t("landing.hero.chipsAria")}
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
                {t("landing.hero.ctaStart")}
              </Link>
              <LandingSectionLink sectionId="how-it-works" className="btn-primary lg">
                {t("landing.hero.ctaHow")}
              </LandingSectionLink>
            </div>

            <p className="landing-hero-trust anim-in" style={{ animationDelay: "160ms" }}>
              <span>{t("landing.hero.trustTrial")}</span>
              <span>{t("landing.hero.trustNoCard")}</span>
              <span>{t("landing.hero.trustReady")}</span>
            </p>
          </div>

          <div
            className="anim-in landing-hero-visual"
            style={{ animationDelay: "100ms", animationDuration: "600ms" }}
          >
            <HeroImageCrossfade images={heroImages} />
          </div>
        </div>
      </div>
    </section>
  );
}
