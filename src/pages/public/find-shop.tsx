import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import MarketingPageShell from "@/components/landing/marketing-page-shell";
import { Search } from "lucide-react";
import { usePlatformBranding } from "@/hooks/use-branding";

export default function FindShopPage() {
  const [slug, setSlug] = useState("");
  const [, setLocation] = useLocation();
  const platform = usePlatformBranding();

  const go = () => {
    const normalized = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (normalized) setLocation(`~/${normalized}/client`);
  };

  return (
    <MarketingPageShell>
      <section className="container-page py-16 lg:py-24">
        <div className="landing-form-card max-w-md mx-auto text-center">
          <p className="landing-eyebrow">Client</p>
          <h1 className="landing-h2 mt-3">Trouver votre commerce</h1>
          <p className="landing-body mt-3">
            Entrez le code de votre boutique {platform.name}
          </p>
          <div className="mt-8 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--landing-text-secondary)]" />
              <Input
                placeholder="mon-commerce"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => e.key === "Enter" && go()}
              />
            </div>
            <button type="button" onClick={go} className="btn-pill shrink-0">
              Ouvrir
            </button>
          </div>
          <p className="landing-body-sm mt-6">
            <Link href="/" className="text-[var(--landing-text)] underline-offset-2 hover:underline">
              Retour à l&apos;accueil
            </Link>
          </p>
        </div>
      </section>
    </MarketingPageShell>
  );
}
