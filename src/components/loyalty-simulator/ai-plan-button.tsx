import { useLocation } from "wouter";
import { Lock, WandSparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { savePulsePlan } from "@/lib/pulse-plan";
import type { StrategyRecommendation } from "@/lib/loyalty-optimizer";

interface AiPlanButtonProps {
  strategy: StrategyRecommendation;
}

/**
 * Applique automatiquement le meilleur plan Pulse à la carte du commerçant.
 * Réservé aux comptes connectés — sinon, redirection vers la connexion.
 */
export function AiPlanButton({ strategy }: AiPlanButtonProps) {
  const { isBusinessAuthenticated, isBusinessLoading } = useAuth();
  const [, navigate] = useLocation();

  const handleClick = () => {
    if (!isBusinessAuthenticated) {
      navigate("/shop");
      return;
    }
    savePulsePlan(strategy);
    navigate("/dashboard/ccard");
  };

  return (
    <div className="pulse-ai-cta">
      <button
        type="button"
        className={`pulse-ai-btn ${!isBusinessAuthenticated ? "pulse-ai-btn-locked" : ""}`}
        onClick={handleClick}
        disabled={isBusinessLoading}
      >
        <span className="pulse-ai-btn-shine" aria-hidden />
        {isBusinessAuthenticated ? (
          <WandSparkles className="h-5 w-5 shrink-0" aria-hidden />
        ) : (
          <Lock className="h-5 w-5 shrink-0" aria-hidden />
        )}
        <span>Appliquer ce plan à ma carte</span>
      </button>
      <p className="pulse-ai-hint">
        {isBusinessAuthenticated
          ? "Pulse prérémplit votre carte fidélité avec ce plan — vous n'avez plus qu'à valider."
          : "Réservé aux comptes Carta : connectez-vous pour appliquer ce plan automatiquement."}
      </p>
    </div>
  );
}
