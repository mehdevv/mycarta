import {
  type BusinessVertical,
  type LoyaltyOptimizerInput,
  type OptimizerResult,
  type RewardPreference,
  VERTICAL_PRESETS,
  computeSweetSpotScore,
  optimizeLoyaltyProgram,
} from "@/lib/loyalty-optimizer";

export type { OptimizerResult };

export interface PulseAutoTune {
  visitsPerMonth: number;
  monthlyActiveCustomers: number;
  maxRewardBudgetPercent: number;
  rewardPreference: RewardPreference;
  sweetSpotScore: number;
}

export interface EssentialBusinessInput {
  vertical: BusinessVertical;
  avgTicketDzd: number;
  marginPercent: number;
}

export type SweetSpotOptimizerResult = OptimizerResult & {
  autoTune: PulseAutoTune;
};

export { computeSweetSpotScore };

function uniqueInts(values: number[]): number[] {
  return [...new Set(values.map((v) => Math.round(v)))];
}

const REWARD_PREF_OPTIONS: RewardPreference[] = ["auto", "stamps", "cashback", "free_product"];

/**
 * Explore les combinaisons et retourne le plan sweet spot (motivation × profit max).
 */
export function findSweetSpotPlan(essentials: EssentialBusinessInput): SweetSpotOptimizerResult {
  const preset = VERTICAL_PRESETS[essentials.vertical];
  const lowMargin = essentials.marginPercent < 48;

  const visitOptions = uniqueInts([
    preset.visitsPerMonth,
    Math.max(2, preset.visitsPerMonth - 1),
    Math.min(30, preset.visitsPerMonth + 1),
    Math.max(2, Math.round(preset.visitsPerMonth * 0.85)),
  ]);

  const customerOptions = uniqueInts([80, 100, 120, 150, 180, 200]);
  const budgetOptions = lowMargin ? [20, 24, 28, 32, 35] : [26, 30, 33, 35, 38, 42];
  const rewardOptions = lowMargin
    ? REWARD_PREF_OPTIONS.filter((r) => r !== "free_product")
    : REWARD_PREF_OPTIONS;

  let best: SweetSpotOptimizerResult | null = null;

  for (const visitsPerMonth of visitOptions) {
    for (const monthlyActiveCustomers of customerOptions) {
      for (const maxRewardBudgetPercent of budgetOptions) {
        for (const rewardPreference of rewardOptions) {
          const input: LoyaltyOptimizerInput = {
            vertical: essentials.vertical,
            avgTicketDzd: essentials.avgTicketDzd,
            marginPercent: essentials.marginPercent,
            visitsPerMonth,
            monthlyActiveCustomers,
            maxRewardBudgetPercent,
            rewardPreference,
            ticketTierMode: "auto",
          };

          const result = optimizeLoyaltyProgram(input);
          const sweetSpotScore = computeSweetSpotScore(result.best);

          if (!best || sweetSpotScore > best.autoTune.sweetSpotScore) {
            best = {
              ...result,
              autoTune: {
                visitsPerMonth,
                monthlyActiveCustomers,
                maxRewardBudgetPercent,
                rewardPreference,
                sweetSpotScore,
              },
            };
          }
        }
      }
    }
  }

  const tuned = best!;
  const motivation = tuned.best.motivationScore;
  const net = Math.round(tuned.best.merchant.monthlyProgramNetDzd);

  tuned.insights = [
    `Sweet spot Pulse : motivation client ${Math.round(motivation)}/100 · profit net ${net >= 0 ? "+" : ""}${net} DZD/mois.`,
    ...tuned.insights.filter((i) => !i.startsWith("Sweet spot Pulse")),
  ];

  return tuned;
}
