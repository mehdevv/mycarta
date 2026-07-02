export type RewardMode = "stamps" | "spend" | "both";

export function resolveSpendReward(
  newCycleSpendDzd: number,
  spendThresholdDzd: number,
  fallbackReward: string,
): {
  rewardTriggered: boolean;
  rewardDescription: string | null;
  finalCycleSpendDzd: number;
} {
  if (spendThresholdDzd <= 0) {
    return {
      rewardTriggered: false,
      rewardDescription: null,
      finalCycleSpendDzd: newCycleSpendDzd,
    };
  }

  if (newCycleSpendDzd >= spendThresholdDzd) {
    return {
      rewardTriggered: true,
      rewardDescription: fallbackReward || "Récompense fidélité",
      finalCycleSpendDzd: 0,
    };
  }

  return {
    rewardTriggered: false,
    rewardDescription: null,
    finalCycleSpendDzd: newCycleSpendDzd,
  };
}

export function spendProgressPercent(current: number, threshold: number): number {
  if (threshold <= 0) return 0;
  return Math.min(100, (current / threshold) * 100);
}

export function spendRemainingDzd(current: number, threshold: number): number {
  return Math.max(0, threshold - current);
}
