import { AlertTriangle, CheckCircle2, Scale } from "lucide-react";
import { formatDzd } from "@/lib/pricing";
import type { MerchantProjection } from "@/lib/loyalty-optimizer";

interface BreakevenPanelProps {
  merchant: MerchantProjection;
  suggestions: string[];
}

/**
 * Investissement → retour, et point mort du programme :
 * combien il faut investir, ce que ça rapporte, et où le profit tombe à 0.
 */
export function BreakevenPanel({ merchant: m, suggestions }: BreakevenPanelProps) {
  const invest = Math.round(m.monthlyRewardSpendDzd);
  const gain = Math.round(m.monthlyLoyaltyGainDzd);
  const roi = m.roiMultiple;
  const breakevenVisits = Math.ceil(m.breakevenVisitsPerMonth);
  const projectedVisits = Math.round(m.projectedExtraVisitsPerMonth);

  const status: "danger" | "warning" | "ok" =
    roi < 1 ? "danger" : roi < 1.5 ? "warning" : "ok";

  const scaleMax = Math.max(projectedVisits, breakevenVisits * 1.25, 1);
  const progressPct = Math.min(100, (projectedVisits / scaleMax) * 100);
  const markerPct = Math.min(98, Math.max(2, (breakevenVisits / scaleMax) * 100));

  return (
    <div className={`pulse-breakeven pulse-breakeven-${status}`}>
      <div className="pulse-breakeven-head">
        <Scale className="h-4 w-4 shrink-0" aria-hidden />
        <h3 className="pulse-breakeven-title">Investissement &amp; point mort</h3>
      </div>

      <p className="pulse-breakeven-invest">
        Investissez <strong>{formatDzd(invest)}/mois</strong> en récompenses →
        récupérez <strong>{formatDzd(gain)}/mois</strong> de marge
        {roi > 0 && (
          <span className={`pulse-breakeven-roi pulse-breakeven-roi-${status}`}>
            ×{roi.toFixed(1)}
          </span>
        )}
      </p>

      <div className="pulse-breakeven-bar-wrap">
        <div className="pulse-breakeven-bar">
          <div
            className="pulse-breakeven-bar-fill"
            style={{ width: `${progressPct}%` }}
          />
          <span className="pulse-breakeven-bar-marker" style={{ left: `${markerPct}%` }} />
        </div>
        <div className="pulse-breakeven-bar-labels">
          <span>0</span>
          <span className="pulse-breakeven-bar-zero">
            Profit = 0 à {breakevenVisits} visites en +/mois
          </span>
          <span>{Math.max(projectedVisits, breakevenVisits * 2)}</span>
        </div>
      </div>

      <p className="pulse-breakeven-verdict">
        {status === "ok" && (
          <>
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            Point mort : <strong>{breakevenVisits} visites</strong> supplémentaires/mois.
            Pulse en prévoit <strong>{projectedVisits}</strong> — le programme s&apos;autofinance
            et dégage du profit.
          </>
        )}
        {status === "warning" && (
          <>
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            Vous êtes juste au-dessus du point mort ({breakevenVisits} visites nécessaires,{" "}
            {projectedVisits} prévues). Rentable, mais peu de marge de sécurité.
          </>
        )}
        {status === "danger" && (
          <>
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            Sous le point mort : il faudrait <strong>{breakevenVisits} visites</strong>{" "}
            supplémentaires/mois pour couvrir les récompenses, Pulse n&apos;en prévoit que{" "}
            <strong>{projectedVisits}</strong>. Le profit du programme est négatif.
          </>
        )}
      </p>

      {suggestions.length > 0 && (
        <div className="pulse-breakeven-tips">
          <p className="pulse-breakeven-tips-title">Pour faire mieux</p>
          <ul>
            {suggestions.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
