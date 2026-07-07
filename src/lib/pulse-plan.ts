import type { StampMilestone } from "@/lib/stamp-milestones";
import type { StrategyRecommendation } from "@/lib/loyalty-optimizer";

/**
 * Handoff du plan Pulse (simulateur) vers l'éditeur de carte du dashboard.
 * Stocké en localStorage, consommé une seule fois, expire après 24 h.
 */
export interface PulsePlan {
  stampsEnabled: boolean;
  spendEnabled: boolean;
  stampThreshold: number;
  spendThresholdDzd: number;
  rewardValue: string;
  stampMilestones: StampMilestone[];
  savedAt: number;
}

const STORAGE_KEY = "carta:pulse-plan";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function savePulsePlan(strategy: StrategyRecommendation): void {
  const plan: PulsePlan = {
    stampsEnabled: strategy.stampsEnabled,
    spendEnabled: strategy.spendEnabled,
    stampThreshold: strategy.stampThreshold ?? 9,
    spendThresholdDzd: strategy.spendThresholdDzd ?? 10000,
    rewardValue: strategy.rewardDescription,
    stampMilestones: (strategy.milestones ?? []).map((m) => ({
      position: m.position,
      label: m.label,
    })),
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  } catch {
    // stockage indisponible (mode privé) : le bouton mènera quand même à l'éditeur
  }
}

export function consumePulsePlan(): PulsePlan | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    localStorage.removeItem(STORAGE_KEY);
    const plan = JSON.parse(raw) as PulsePlan;
    if (typeof plan.savedAt !== "number" || Date.now() - plan.savedAt > MAX_AGE_MS) {
      return null;
    }
    return plan;
  } catch {
    return null;
  }
}
