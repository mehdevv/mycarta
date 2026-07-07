import { Sparkles } from "lucide-react";
import type { PulseAutoTune } from "@/lib/loyalty-sweet-spot";
import type { RewardPreference } from "@/lib/loyalty-optimizer";

const REWARD_LABELS: Record<RewardPreference, string> = {
  auto: "Pulse choisit le meilleur mix",
  stamps: "Programme tampons",
  cashback: "Cashback / paliers",
  free_product: "Récompense majorée",
};

interface AutoTunePanelProps {
  autoTune: PulseAutoTune;
  motivationScore: number;
}

export function AutoTunePanel({ autoTune, motivationScore }: AutoTunePanelProps) {
  return (
    <div className="pulse-auto-tune">
      <div className="pulse-auto-tune-head">
        <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
        <div>
          <p className="pulse-auto-tune-title">Pulse a calibré pour vous</p>
          <p className="pulse-auto-tune-hint">
            Sweet spot — motivation {Math.round(motivationScore)}/100 · score{" "}
            {Math.round(autoTune.sweetSpotScore)}
          </p>
        </div>
      </div>
      <ul className="pulse-auto-tune-grid">
        <li>
          <span className="pulse-auto-tune-k">Visites / mois</span>
          <span className="pulse-auto-tune-v">{autoTune.visitsPerMonth}</span>
        </li>
        <li>
          <span className="pulse-auto-tune-k">Clients actifs</span>
          <span className="pulse-auto-tune-v">{autoTune.monthlyActiveCustomers}</span>
        </li>
        <li>
          <span className="pulse-auto-tune-k">Budget fidélité</span>
          <span className="pulse-auto-tune-v">{autoTune.maxRewardBudgetPercent}% marge</span>
        </li>
        <li>
          <span className="pulse-auto-tune-k">Type de programme</span>
          <span className="pulse-auto-tune-v">{REWARD_LABELS[autoTune.rewardPreference]}</span>
        </li>
      </ul>
    </div>
  );
}
