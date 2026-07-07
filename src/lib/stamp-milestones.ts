export type StampMilestone = {
  position: number;
  label: string;
};

export function parseStampMilestones(raw: unknown): StampMilestone[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;
      const row = item as StampMilestone;
      const position = Math.floor(Number(row.position));
      const label = String(row.label ?? "").trim();
      if (!Number.isFinite(position) || position < 1 || !label) return null;
      return { position, label };
    })
    .filter((item): item is StampMilestone => item !== null)
    .sort((a, b) => a.position - b.position);
}

export function clampMilestonesToThreshold(
  milestones: StampMilestone[],
  threshold: number,
): StampMilestone[] {
  return milestones
    .filter((m) => m.position >= 1 && m.position <= threshold)
    .sort((a, b) => a.position - b.position);
}

export function getMilestoneAt(
  milestones: StampMilestone[],
  position: number,
): StampMilestone | undefined {
  return milestones.find((m) => m.position === position);
}

/**
 * Toujours afficher la grande récompense sur le dernier tampon de la carte
 * (position === stampThreshold) pour motiver le client à finir.
 */
export function withGrandPrizeOnFinalStamp(
  milestones: StampMilestone[],
  stampThreshold: number,
  finalRewardLabel: string,
): StampMilestone[] {
  const label = finalRewardLabel.trim();
  if (!label || stampThreshold < 1) return milestones;
  const withoutFinal = milestones.filter((m) => m.position !== stampThreshold);
  return [...withoutFinal, { position: stampThreshold, label }].sort(
    (a, b) => a.position - b.position,
  );
}

export function resolveStampReward(
  newCycleStamps: number,
  threshold: number,
  milestones: StampMilestone[],
  fallbackReward: string,
): {
  rewardTriggered: boolean;
  rewardDescription: string | null;
  finalCycleStamps: number;
} {
  const milestone = getMilestoneAt(milestones, newCycleStamps);

  if (milestone) {
    return {
      rewardTriggered: true,
      rewardDescription: milestone.label,
      finalCycleStamps: newCycleStamps >= threshold ? 0 : newCycleStamps,
    };
  }

  if (newCycleStamps >= threshold) {
    return {
      rewardTriggered: true,
      rewardDescription: fallbackReward || "Loyalty reward",
      finalCycleStamps: 0,
    };
  }

  return {
    rewardTriggered: false,
    rewardDescription: null,
    finalCycleStamps: newCycleStamps,
  };
}
