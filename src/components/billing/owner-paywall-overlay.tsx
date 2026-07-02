import { Link, useLocation } from "wouter";
import { AlertTriangle, CreditCard } from "lucide-react";
import { useCurrentTenant } from "@/lib/tenant-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function isBillingRoute(location: string) {
  return location === "/billing" || location.endsWith("/billing");
}

export default function OwnerPaywallOverlay() {
  const { trialStatus, tenant } = useCurrentTenant();
  const [location] = useLocation();

  if (!tenant || !trialStatus || trialStatus.isActive) return null;
  if (isBillingRoute(location)) return null;

  return (
    <div
      className="dash-paywall-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dash-paywall-title"
    >
      <div className="dash-paywall-backdrop" aria-hidden />
      <div className="dash-paywall-card">
        <div className="dash-paywall-icon" aria-hidden>
          <AlertTriangle size={28} />
        </div>
        <h2 id="dash-paywall-title" className="dash-paywall-title">
          Votre essai ou abonnement a expiré
        </h2>
        <p className="dash-paywall-desc">
          Le tableau de bord est en pause. Choisissez un plan pour réactiver les scans, les nouvelles
          inscriptions clients et toutes les fonctionnalités.
        </p>
        <div className="dash-paywall-actions">
          <Link href="/billing">
            <Button size="lg" className={cn("gap-2", "w-full sm:w-auto")}>
              <CreditCard className="h-4 w-4" />
              Choisir un plan
            </Button>
          </Link>
        </div>
        <p className="dash-paywall-foot">
          Vos clients voient un message leur demandant de vous contacter directement.
        </p>
      </div>
    </div>
  );
}
