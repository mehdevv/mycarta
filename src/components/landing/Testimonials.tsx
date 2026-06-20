import { Link } from "wouter";
import { Star } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { usePlatformBranding } from "@/hooks/use-branding";
import { useLocale } from "@/lib/i18n/locale-context";
import feedbackIllustration from "@/assets/feedback.png";

function TestimonialsVisual({ className = "", imageAlt }: { className?: string; imageAlt: string }) {
  return (
    <div className={`landing-testimonials-visual ${className}`}>
      <img
        src={feedbackIllustration}
        alt={imageAlt}
        className="landing-testimonials-illustration"
      />
    </div>
  );
}

export function LandingTestimonials() {
  const platform = usePlatformBranding();
  const { t } = useLocale();

  const quotes = [
    {
      text: t("landing.testimonials.q1"),
      initials: "NK",
      name: "Nadia K.",
      role: t("landing.testimonials.q1Role"),
      featured: true,
    },
    {
      text: t("landing.testimonials.q2"),
      initials: "MR",
      name: "Mehdi R.",
      role: t("landing.testimonials.q2Role"),
      featured: false,
    },
    {
      text: t("landing.testimonials.q3"),
      initials: "ID",
      name: "Inès D.",
      role: t("landing.testimonials.q3Role"),
      featured: false,
    },
  ];

  const featured = quotes.find((q) => q.featured)!;
  const others = quotes.filter((q) => !q.featured);

  return (
    <section className="landing-section" style={{ background: "var(--landing-bg-secondary)" }}>
      <div className="container-page">
        <div className="landing-testimonials-grid">
          <div className="landing-testimonials-content">
            <SectionHeader
              eyebrow={t("landing.testimonials.eyebrow")}
              title={t("landing.testimonials.title")}
              description={t("landing.testimonials.description", { name: platform.name })}
              align="left"
              className="!mb-8 lg:!mb-10"
            />

            <TestimonialsVisual className="lg:hidden mb-8" imageAlt={t("landing.testimonials.imageAlt")} />

            <blockquote className="landing-card landing-card--highlight mb-6 lg:mb-8">
              <div className="flex gap-1 mb-5" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={16} fill="var(--landing-brand)" color="var(--landing-brand)" />
                ))}
              </div>
              <p className="landing-quote-text text-[1.0625rem] lg:text-[1.125rem]">&ldquo;{featured.text}&rdquo;</p>
              <footer className="mt-6 lg:mt-8 flex items-center gap-4">
                <div
                  className="flex items-center justify-center text-[14px] font-medium w-11 h-11 rounded-full"
                  style={{ background: "var(--landing-brand-soft)", color: "var(--landing-brand-hover)" }}
                >
                  {featured.initials}
                </div>
                <div>
                  <cite className="text-[15px] font-medium not-italic">{featured.name}</cite>
                  <p className="landing-body-sm mt-0.5">{featured.role}</p>
                </div>
              </footer>
            </blockquote>

            <div className="grid gap-5 sm:grid-cols-2">
              {others.map((q) => (
                <blockquote key={q.name} className="landing-card h-full flex flex-col">
                  <p className="landing-quote-text flex-1 text-[0.9375rem]">&ldquo;{q.text}&rdquo;</p>
                  <footer className="mt-6 flex items-center gap-3 pt-4 border-t border-[var(--landing-border)]">
                    <div
                      className="flex items-center justify-center text-[13px] font-medium w-9 h-9 rounded-full"
                      style={{ background: "var(--landing-brand-soft)", color: "var(--landing-brand-hover)" }}
                    >
                      {q.initials}
                    </div>
                    <div>
                      <cite className="text-[14px] font-medium not-italic">{q.name}</cite>
                      <p className="text-[12px] text-[var(--landing-text-secondary)] mt-0.5">{q.role}</p>
                    </div>
                  </footer>
                </blockquote>
              ))}
            </div>

            <Link href="/shop?tab=signup" className="btn-pill w-full sm:w-auto justify-center mt-10 lg:mt-12">
              {t("landing.testimonials.cta")}
            </Link>
          </div>

          <TestimonialsVisual
            className="hidden lg:flex landing-testimonials-visual--sticky"
            imageAlt={t("landing.testimonials.imageAlt")}
          />
        </div>
      </div>
    </section>
  );
}
