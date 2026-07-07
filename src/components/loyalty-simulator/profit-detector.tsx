import { formatDzd } from "@/lib/pricing";
import type { StrategyRecommendation } from "@/lib/loyalty-optimizer";

interface ProfitDetectorProps {
  strategy: StrategyRecommendation;
  /** true = chiffres encore partiels (valeurs par défaut utilisées). */
  isEstimate?: boolean;
  /** Barre compacte collée en haut du formulaire pendant l'édition. */
  compact?: boolean;
}

/**
 * Détecteur de profit en direct sous la carte :
 * le commerçant voit immédiatement si le programme est rentable.
 */
export function ProfitDetector({
  strategy,
  isEstimate = false,
  compact = false,
}: ProfitDetectorProps) {
  const m = strategy.merchant;
  const netRaw = m.monthlyProgramNetDzd;
  const net = Math.round(netRaw);
  const status: "profit" | "even" | "loss" =
    netRaw > 250 ? "profit" : netRaw < -250 ? "loss" : "even";

  const subLine =
    status === "profit"
      ? `Rentable : ${formatDzd(Math.round(m.monthlyLoyaltyGainDzd))} gagnés pour ${formatDzd(Math.round(m.monthlyRewardSpendDzd))} investis (×${m.roiMultiple.toFixed(1)}).`
      : status === "even"
        ? "Point mort exact : le programme se rembourse tout juste."
        : `À perte : les récompenses (${formatDzd(Math.round(m.monthlyRewardSpendDzd))}) coûtent plus que le gain (${formatDzd(Math.round(m.monthlyLoyaltyGainDzd))}). Ajustez vos réglages.`;

  return (
    <div
      className={`pulse-profit-detector pulse-profit-detector-${status}${compact ? " pulse-profit-detector-compact" : ""}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="pulse-profit-detector-compact-row">
        <div className="pulse-profit-detector-head">
          <span className="pulse-profit-live-dot" aria-hidden />
          <span className="pulse-profit-detector-label">
            Profit live{isEstimate ? " (estimé)" : ""}
          </span>
        </div>
        <p className="pulse-profit-detector-value">
          {net > 0 ? "+" : net < 0 ? "−" : ""}
          {formatDzd(Math.abs(net))}
          <span className="pulse-profit-detector-period">/ mois</span>
        </p>
      </div>
      <p className="pulse-profit-detector-sub">{subLine}</p>
      {isEstimate && !compact && (
        <p className="pulse-profit-detector-note">
          Se met à jour à chaque chiffre saisi — complétez tous les champs pour l&apos;analyse
          finale.
        </p>
      )}
    </div>
  );
}
