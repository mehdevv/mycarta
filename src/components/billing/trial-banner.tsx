import { Link } from "wouter";
import { AlertTriangle, Clock } from "lucide-react";
import { useCurrentTenant } from "@/lib/tenant-context";
import type { TrialStatus } from "@/api/tenant";
import { Button } from "@/components/ui/button";

function isTrialBannerVisible(
  tenant: { id: string } | null | undefined,
  trialStatus: TrialStatus | null | undefined,
): boolean {
  if (!tenant || !trialStatus) return false;
  if (trialStatus.isActive && trialStatus.planId !== "trial") return false;
  if (!trialStatus.isActive) return true;
  return trialStatus.planId === "trial" && trialStatus.daysLeft <= 3;
}

export function useShowTrialBanner(): boolean {
  const { trialStatus, tenant } = useCurrentTenant();
  return isTrialBannerVisible(tenant, trialStatus);
}

export default function TrialBanner() {
  const { trialStatus, tenant } = useCurrentTenant();

  if (!isTrialBannerVisible(tenant, trialStatus) || !trialStatus) return null;

  if (!trialStatus.isActive) {
    return (
      <div
        className="dash-trial-float-bar dash-trial-float-bar--expired"
        role="region"
        aria-label="Accès suspendu"
      >
        <div className="dash-trial-float-bar-content">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              <strong>Accès suspendu.</strong> Votre essai gratuit a expiré ou votre abonnement a été
              annulé. Réactivez votre compte pour continuer.
            </span>
          </div>
          <Link href="/billing">
            <Button size="sm" variant="destructive">
              Choisir un plan
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-trial-float-bar dash-trial-float-bar--active" role="region" aria-label="Essai gratuit">
      <div className="dash-trial-float-bar-content">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0" />
          <span>
            Essai gratuit — <strong>{trialStatus.daysLeft} jour(s)</strong> restant(s) ·{" "}
            {trialStatus.clientLimit ?? 10} clients et {trialStatus.scansTotalLimit ?? 25} scans inclus
          </span>
        </div>
        <Link href="/billing">
          <Button size="sm" className="bg-amber-600 hover:bg-amber-500 shrink-0">
            Voir les plans
          </Button>
        </Link>
      </div>
    </div>
  );
}
