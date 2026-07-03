import { useEffect } from "react";
import { LandingNav } from "@/components/landing/Nav";
import { LandingTutorials } from "@/components/landing/LandingTutorials";
import { LandingHero } from "@/components/landing/Hero";
import { LandingLogoMarquee } from "@/components/landing/LogoMarquee";
import { LandingProblem } from "@/components/landing/Problem";
import { LandingHowItWorks } from "@/components/landing/HowItWorks";
import { LandingFeatures } from "@/components/landing/Features";
import { LandingPricing } from "@/components/landing/Pricing";
import { LandingTestimonials } from "@/components/landing/Testimonials";
import { LandingSecurity } from "@/components/landing/Security";
import { LandingFinalCTA } from "@/components/landing/FinalCTA";
import { LandingFooter } from "@/components/landing/Footer";
import {
  consumePendingLandingScroll,
  scrollToHashFromUrl,
  scrollToLandingSection,
} from "@/lib/landing-scroll";
import PageMeta from "@/components/seo/page-meta";
import { LANDING_JSON_LD } from "@/lib/seo";
import { usePlatformBranding } from "@/hooks/use-branding";

export default function LandingPage() {
  const platform = usePlatformBranding();
  useEffect(() => {
    const runScroll = () => {
      const pending = consumePendingLandingScroll();
      if (pending) {
        const attempt = (tries: number) => {
          if (scrollToLandingSection(pending, tries === 0 ? "smooth" : "auto")) {
            window.history.replaceState(null, "", `/#${pending}`);
            return;
          }
          if (tries < 24) requestAnimationFrame(() => attempt(tries + 1));
        };
        attempt(0);
        return;
      }
      scrollToHashFromUrl();
    };

    runScroll();
    window.addEventListener("hashchange", runScroll);
    return () => window.removeEventListener("hashchange", runScroll);
  }, []);

  return (
    <main className="landing-page min-h-screen">
      <PageMeta
        title="Cartes fidélité digitales pour commerces"
        description={`${platform.tagline}. Scans QR, tampons et récompenses — sans application à installer pour vos clients.`}
        jsonLd={LANDING_JSON_LD}
      />
      <LandingNav />
      <LandingHero />
      <LandingTutorials />
      <LandingLogoMarquee />
      <LandingProblem />
      <LandingHowItWorks />
      <LandingFeatures />
      <LandingPricing />
      <LandingTestimonials />
      <LandingSecurity />
      <LandingFinalCTA />
      <LandingFooter />
    </main>
  );
}

