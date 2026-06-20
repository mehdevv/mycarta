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

export default function LandingPage() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const el = document.querySelector(hash);
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth" }));
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
