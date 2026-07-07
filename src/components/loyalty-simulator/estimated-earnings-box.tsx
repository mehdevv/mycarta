import { Heart, TrendingUp } from "lucide-react";
import { formatDzd } from "@/lib/pricing";
import type { MerchantProjection } from "@/lib/loyalty-optimizer";

interface EstimatedEarningsBoxProps {
  merchant: MerchantProjection;
}

export function EstimatedEarningsBox({ merchant: m }: EstimatedEarningsBoxProps) {
  const monthlyNet = Math.round(m.monthlyProgramNetDzd);
  const yearlyNet = Math.round(m.yearlyProgramNetDzd);
  const sign = monthlyNet >= 0 ? "+" : "−";

  return (
    <div className="pulse-earnings-box">
      <div className="pulse-earnings-box-head">
        <TrendingUp className="h-5 w-5 shrink-0" aria-hidden />
        <div>
          <p className="pulse-earnings-box-eyebrow">Gain net</p>
          <h3 className="pulse-earnings-box-title">
            Ce que le programme vous rapporte, récompenses déduites
          </h3>
        </div>
      </div>

      <div className="pulse-earnings-kpi-row">
        <div className="pulse-earnings-kpi">
          <p className="pulse-earnings-kpi-value">
            {sign}
            {formatDzd(Math.abs(monthlyNet))}
            <span className="pulse-earnings-box-period">/ mois</span>
          </p>
          <p className="pulse-earnings-kpi-label">Gain net mensuel</p>
        </div>
        <div className="pulse-earnings-kpi pulse-earnings-kpi-featured">
          <p className="pulse-earnings-kpi-value">
            {sign}
            {formatDzd(Math.abs(yearlyNet))}
            <span className="pulse-earnings-box-period">/ an</span>
          </p>
          <p className="pulse-earnings-kpi-label">Gain net annuel</p>
        </div>
      </div>

      <p className="pulse-earnings-box-sub">
        Les clients qui reviennent grâce au programme rapportent{" "}
        <strong>{formatDzd(Math.round(m.monthlyLoyaltyGainDzd))}/mois</strong> de marge, pour{" "}
        <strong>{formatDzd(Math.round(m.monthlyRewardSpendDzd))}/mois</strong> de récompenses
        (rétention <strong>{m.estimatedRetentionPercent.toFixed(0)}%</strong> vs{" "}
        {m.baselineRetentionPercent.toFixed(0)}% sans programme).
      </p>

      <div className="pulse-earnings-box-foot">
        <span className="pulse-earnings-foot-item">
          <Heart className="h-3.5 w-3.5" aria-hidden />
          Clients qui reviennent : {formatDzd(Math.round(m.yearlyLoyaltyGainDzd))}/an
        </span>
        <span>Récompenses : {formatDzd(Math.round(m.monthlyRewardSpendDzd * 12))}/an</span>
      </div>
    </div>
  );
}
