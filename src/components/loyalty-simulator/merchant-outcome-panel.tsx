import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatDzd } from "@/lib/pricing";
import type { MerchantProjection } from "@/lib/loyalty-optimizer";

interface MerchantOutcomePanelProps {
  merchant: MerchantProjection;
}

/**
 * 3 simple KPIs qui racontent l'histoire du programme :
 * les clients qui reviennent rapportent X − les récompenses coûtent Y = net Z.
 */
export function MerchantSimpleKpis({ merchant: m }: MerchantOutcomePanelProps) {
  const net = Math.round(m.monthlyProgramNetDzd);
  return (
    <div className="pulse-kpi-strip">
      <div className="pulse-kpi pulse-kpi-retention">
        <p className="pulse-kpi-value">+{formatDzd(Math.round(m.monthlyLoyaltyGainDzd))}</p>
        <p className="pulse-kpi-label">Clients qui reviennent / mois</p>
      </div>
      <div className="pulse-kpi pulse-kpi-loss">
        <p className="pulse-kpi-value">−{formatDzd(Math.round(m.monthlyRewardSpendDzd))}</p>
        <p className="pulse-kpi-label">Coût récompenses / mois</p>
      </div>
      <div className={`pulse-kpi ${net >= 0 ? "pulse-kpi-win" : "pulse-kpi-loss"}`}>
        <p className="pulse-kpi-value">
          {net >= 0 ? "+" : "−"}
          {formatDzd(Math.abs(net))}
        </p>
        <p className="pulse-kpi-label">Gain net du programme / mois</p>
      </div>
    </div>
  );
}

export function MerchantOutcomeDetails({ merchant: m }: MerchantOutcomePanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="pulse-merchant-details-wrap">
      <button
        type="button"
        className="pulse-details-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? "Masquer" : "Voir"} le détail financier
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="pulse-merchant-details">
          <div className="pulse-merchant-detail-row">
            <span>Visites en plus des membres</span>
            <strong className="text-emerald-700">
              +{formatDzd(Math.round(m.monthlyLoyaltyGainDzd - m.monthlyRetentionGainDzd))}/mois
            </strong>
          </div>
          <div className="pulse-merchant-detail-row">
            <span>Clients retenus (seraient partis)</span>
            <strong className="text-emerald-700">
              +{formatDzd(Math.round(m.monthlyRetentionGainDzd))}/mois
            </strong>
          </div>
          <div className="pulse-merchant-detail-row">
            <span>Coût récompenses</span>
            <strong className="text-red-600">
              −{formatDzd(Math.round(m.monthlyRewardSpendDzd))}/mois
            </strong>
          </div>
          <div className="pulse-merchant-detail-row">
            <span>Rétention : {m.baselineRetentionPercent.toFixed(0)}% sans programme</span>
            <strong className="text-emerald-700">
              {m.estimatedRetentionPercent.toFixed(0)}% avec (+
              {m.retentionUpliftPercent.toFixed(0)} pts)
            </strong>
          </div>
          <div className="pulse-merchant-detail-row">
            <span>Marge brute de votre activité</span>
            <strong>{formatDzd(Math.round(m.monthlyGrossMarginDzd))}/mois</strong>
          </div>
          <div className="pulse-merchant-detail-row pulse-merchant-detail-row-total">
            <span>Gain net du programme / an</span>
            <strong>{formatDzd(Math.round(m.yearlyProgramNetDzd))}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
