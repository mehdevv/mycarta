import { useEffect } from "react";
import { LandingNav } from "@/components/landing/Nav";
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

export default function LandingPage() {
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
      <LandingNav />
      <LandingHero />
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
