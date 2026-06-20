import { Link } from "wouter";
import { AlertTriangle, Clock } from "lucide-react";
import { useCurrentTenant } from "@/lib/tenant-context";
import { Button } from "@/components/ui/button";

export default function TrialBanner() {
  const { trialStatus, tenant } = useCurrentTenant();

  if (!tenant || !trialStatus) return null;

  if (trialStatus.isActive && trialStatus.planId !== "trial") return null;

  if (!trialStatus.isActive) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Votre essai ou abonnement a expiré. Passez à un plan payant pour continuer.</span>
        </div>
        <Link href="/billing">
          <Button size="sm" variant="destructive">
            Mettre à niveau
          </Button>
        </Link>
      </div>
    );
  }

  if (trialStatus.planId === "trial" && trialStatus.daysLeft <= 14) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
          <Clock className="h-4 w-4 shrink-0" />
          <span>
            Essai gratuit — <strong>{trialStatus.daysLeft} jour(s)</strong> restant(s) · accès complet avec
            quotas (ex. 3 prompts IA / jour)
          </span>
        </div>
        <Link href="/billing">
          <Button size="sm" className="bg-amber-600 hover:bg-amber-500">
            Voir les plans
          </Button>
        </Link>
      </div>
    );
  }

  return null;
}
