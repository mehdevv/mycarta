import { useEffect } from "react";
import LandingPage from "@/pages/marketing/landing";

export default function PricingRedirect() {
  useEffect(() => {
    const scroll = () => {
      const el = document.getElementById("pricing");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    };
    if (document.getElementById("pricing")) {
      scroll();
    } else {
      window.requestAnimationFrame(scroll);
    }
  }, []);

  return <LandingPage />;
}
