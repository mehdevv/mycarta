import { useEffect } from "react";
import LandingPage from "@/pages/marketing/landing";
import { scrollToLandingSection } from "@/lib/landing-scroll";

export default function PricingRedirect() {
  useEffect(() => {
    const scroll = () => scrollToLandingSection("pricing");
    requestAnimationFrame(scroll);
    window.history.replaceState(null, "", "/#pricing");
  }, []);

  return <LandingPage />;
}
