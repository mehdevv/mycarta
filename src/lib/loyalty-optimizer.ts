import { formatDzd } from "@/lib/pricing";
import {
  type RewardProfile,
  type TicketTier,
  type TicketTierMode,
  clampTicketToTier,
  getTicketTierConfig,
  resolveTicketTier,
  roundRewardAmountDzd,
} from "@/lib/ticket-tier";
import { withGrandPrizeOnFinalStamp } from "@/lib/stamp-milestones";

export type { RewardProfile, TicketTier, TicketTierMode } from "@/lib/ticket-tier";
export {
  TICKET_TIER_CONFIG,
  TICKET_TIER_FILTER_OPTIONS,
  clampTicketToTier,
  detectTicketTier,
  resolveTicketTier,
  getTicketTierConfig,
} from "@/lib/ticket-tier";

export type BusinessVertical =
  | "cafe"
  | "restaurant"
  | "bakery"
  | "beauty"
  | "retail"
  | "other";

export type RewardPreference = "auto" | "stamps" | "cashback" | "free_product";

export interface LoyaltyOptimizerInput {
  vertical: BusinessVertical;
  avgTicketDzd: number;
  marginPercent: number;
  visitsPerMonth: number;
  monthlyActiveCustomers: number;
  rewardPreference: RewardPreference;
  /** Max share of cycle gross margin allocated to the reward (default 35). */
  maxRewardBudgetPercent?: number;
  /** Auto-detect tier from panier, or force low / normal / high / super_high. */
  ticketTierMode?: TicketTierMode;
}

const MIN_REDUCTION_PCT = 10;
const REDUCTION_STEP_PCT = 5;
const MAX_REDUCTION_PCT = 30;
/** Tampons de référence pour dimensionner le budget récompense (% de la marge du cycle). */
const REFERENCE_CYCLE_STAMPS = 8;

interface LowMarginStampPolicy {
  minStamps: number;
  maxMilestones: 1 | 2 | 3;
  budgetScale: number;
  rewardScale: number;
  minRetainedPercent: number;
  includeFinalStretch: boolean;
}

/**
 * Marge faible → cycle plus long (plus de tampons à collecter), moins de jalons,
 * récompenses plus petites : le commerçant garde du profit net.
 */
function getLowMarginStampPolicy(marginPercent: number): LowMarginStampPolicy {
  if (marginPercent < 32) {
    return {
      minStamps: 11,
      maxMilestones: 1,
      budgetScale: 0.52,
      rewardScale: 0.4,
      minRetainedPercent: 70,
      includeFinalStretch: false,
    };
  }
  if (marginPercent < 40) {
    return {
      minStamps: 10,
      maxMilestones: 2,
      budgetScale: 0.62,
      rewardScale: 0.5,
      minRetainedPercent: 66,
      includeFinalStretch: false,
    };
  }
  if (marginPercent < 48) {
    return {
      minStamps: 8,
      maxMilestones: 2,
      budgetScale: 0.75,
      rewardScale: 0.65,
      minRetainedPercent: 60,
      includeFinalStretch: true,
    };
  }
  if (marginPercent < 55) {
    return {
      minStamps: 7,
      maxMilestones: 2,
      budgetScale: 0.88,
      rewardScale: 0.82,
      minRetainedPercent: 55,
      includeFinalStretch: true,
    };
  }
  return {
    minStamps: 5,
    maxMilestones: 3,
    budgetScale: 1,
    rewardScale: 1,
    minRetainedPercent: 52,
    includeFinalStretch: true,
  };
}

/**
 * Hypothèses business paramétrées (moyennes sectorielles fidélité) :
 * - Tous les clients ne rejoignent pas le programme : seuls les membres coûtent
 *   des récompenses et génèrent le gain fidélité.
 * - Les membres reviennent plus souvent (uplift de fréquence).
 * - Une partie des clients "sauvés" par le programme continue de visiter.
 */
const PROGRAM_PARTICIPATION_RATE = 0.65;
const MEMBER_FREQUENCY_UPLIFT = 0.18;
const RETENTION_VISIT_FACTOR = 0.5;

export interface MilestoneSuggestion {
  position: number;
  label: string;
  /** "fixed" = montant DZD exact offert, "percent" = réduction en %. */
  kind: "fixed" | "percent";
  discountPercent?: number;
  amountDzd?: number;
}

export interface MerchantProjection {
  /** Marge brute totale des clients actifs / mois (avec ou sans programme) */
  monthlyGrossMarginDzd: number;
  /** Coût des récompenses distribuées / mois (membres du programme uniquement) */
  monthlyRewardSpendDzd: number;
  /** Marge conservée après récompenses / mois */
  monthlyMarginKeptDzd: number;
  /**
   * Profit généré par les clients qui reviennent grâce au programme / mois :
   * visites supplémentaires des membres + clients retenus.
   */
  monthlyLoyaltyGainDzd: number;
  /** Même gain fidélité annualisé */
  yearlyLoyaltyGainDzd: number;
  /** Sous-partie : marge des clients retenus (qui seraient partis) / mois */
  monthlyRetentionGainDzd: number;
  /** Même gain rétention annualisé */
  yearlyRetentionGainDzd: number;
  /** Bilan net du programme / mois = gain fidélité − coût récompenses */
  monthlyProgramNetDzd: number;
  /** Bilan net du programme / an */
  yearlyProgramNetDzd: number;
  /** Marge totale estimée après récompenses / mois (activité entière) */
  monthlyNetWinDzd: number;
  /** Projection marge totale / an */
  yearlyNetWinDzd: number;
  /** Taux de rétention estimé avec le programme */
  estimatedRetentionPercent: number;
  /** Amélioration vs sans programme fidélité */
  retentionUpliftPercent: number;
  /** Rétention de base sans programme (estimation) */
  baselineRetentionPercent: number;
  /** Retour sur investissement : gain fidélité / coût récompenses (×N) */
  roiMultiple: number;
  /** Seuil de rentabilité : visites supplémentaires/mois nécessaires pour couvrir les récompenses */
  breakevenVisitsPerMonth: number;
  /** Visites supplémentaires/mois que Pulse prévoit avec ce programme */
  projectedExtraVisitsPerMonth: number;
}

export interface StrategyRecommendation {
  id: "stamps" | "spend" | "hybrid";
  rank: number;
  score: number;
  title: string;
  badge: string;
  mode: "stamps" | "spend" | "both";
  stampsEnabled: boolean;
  spendEnabled: boolean;
  stampThreshold?: number;
  spendThresholdDzd?: number;
  rewardDescription: string;
  customerPitch: string;
  effectiveDiscountPercent: number;
  rewardCostDzd: number;
  grossMarginPerCycleDzd: number;
  netMarginPerCycleDzd: number;
  marginRetainedPercent: number;
  motivationScore: number;
  safetyScore: number;
  milestones?: MilestoneSuggestion[];
  whyItWorks: string;
  monthlyRewardCostEstimateDzd: number;
  rewardProfile: RewardProfile;
  ticketTier: TicketTier;
  merchant: MerchantProjection;
}

export interface OptimizerResult {
  strategies: StrategyRecommendation[];
  best: StrategyRecommendation;
  insights: string[];
  /** Conseils si le meilleur scénario est proche ou en-dessous du point mort. */
  breakevenSuggestions: string[];
  /** Paramètres calibrés automatiquement par l'algorithme sweet spot. */
  autoTune?: {
    visitsPerMonth: number;
    monthlyActiveCustomers: number;
    maxRewardBudgetPercent: number;
    rewardPreference: RewardPreference;
    sweetSpotScore: number;
  };
}

/**
 * Sweet spot : motivation client + profit net + ROI.
 * Assez généreux pour pousser à l'achat, assez serré pour gagner.
 */
export function computeSweetSpotScore(strategy: StrategyRecommendation): number {
  const m = strategy.merchant;
  const motivation = strategy.motivationScore;
  const net = m.monthlyProgramNetDzd;

  const profitPts =
    net <= 0
      ? Math.min(0, Math.max(-50, net / 400))
      : Math.min(48, Math.log10(net + 1) * 14);

  const roiPts = Math.min(28, (Math.min(m.roiMultiple, 3) / 3) * 28);

  const balanceBonus =
    motivation >= 50 && net > 0 ? 12 : motivation >= 45 && net >= 0 ? 6 : 0;

  const lossPenalty = net < -500 ? -15 : 0;

  return motivation * 0.38 + profitPts + roiPts + balanceBonus + lossPenalty;
}

export const VERTICAL_PRESETS: Record<
  BusinessVertical,
  { label: string; avgTicketDzd: number; marginPercent: number; visitsPerMonth: number }
> = {
  cafe: { label: "Café / Coffee shop", avgTicketDzd: 350, marginPercent: 65, visitsPerMonth: 8 },
  restaurant: { label: "Restaurant", avgTicketDzd: 1200, marginPercent: 55, visitsPerMonth: 4 },
  bakery: { label: "Boulangerie", avgTicketDzd: 280, marginPercent: 58, visitsPerMonth: 10 },
  beauty: { label: "Salon / Beauté", avgTicketDzd: 2500, marginPercent: 62, visitsPerMonth: 2 },
  retail: { label: "Boutique", avgTicketDzd: 1800, marginPercent: 45, visitsPerMonth: 3 },
  other: { label: "Autre commerce", avgTicketDzd: 800, marginPercent: 50, visitsPerMonth: 5 },
};

const NICE_STAMPS = [5, 6, 7, 8, 9, 10, 11, 12] as const;
const NICE_SPEND = [
  2500, 3000, 4000, 5000, 7500, 10000, 12500, 15000, 20000, 25000, 30000, 40000, 50000,
] as const;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Réductions uniquement par paliers de 5 %, minimum 10 %. */
function snapReductionPercent(raw: number, min = MIN_REDUCTION_PCT, max = MAX_REDUCTION_PCT): number {
  if (max <= 0) return 0;
  const raised = Math.max(min, raw);
  const stepped = Math.round(raised / REDUCTION_STEP_PCT) * REDUCTION_STEP_PCT;
  return clamp(stepped, min, max);
}

function milestoneReductionForTier(index: number, tier: ReturnType<typeof getTicketTierConfig>): number {
  if (!tier.allowPercentReduction) return 0;
  const pct = tier.minReductionPct + index * REDUCTION_STEP_PCT;
  return snapReductionPercent(pct, tier.minReductionPct, tier.maxReductionPct);
}

function roundToNice(value: number, options: readonly number[]) {
  return options.reduce((best, option) =>
    Math.abs(option - value) < Math.abs(best - value) ? option : best,
  );
}

function pickStampThreshold(
  rawMin: number,
  profitPerVisit: number,
  rewardCost: number,
  options?: { minStamps?: number; minRetainedPercent?: number },
) {
  const minStamps = options?.minStamps ?? 5;
  const minRetained = options?.minRetainedPercent ?? 52;
  let threshold = roundToNice(Math.ceil(rawMin), NICE_STAMPS);
  threshold = clamp(Math.max(threshold, minStamps), 5, 12);

  for (let i = 0; i < NICE_STAMPS.length; i++) {
    const gross = threshold * profitPerVisit;
    const retained = gross > 0 ? ((gross - rewardCost) / gross) * 100 : 0;
    if (retained >= minRetained) break;
    const idx = NICE_STAMPS.indexOf(threshold as (typeof NICE_STAMPS)[number]);
    const next = idx >= 0 ? NICE_STAMPS[idx + 1] : undefined;
    if (!next) break;
    threshold = next;
  }

  return threshold;
}

function motivationFromStamps(threshold: number) {
  return clamp(100 - (threshold - 5) * 9, 42, 98);
}

function motivationFromSpend(thresholdDzd: number, avgTicket: number) {
  const visitsToReward = thresholdDzd / Math.max(avgTicket, 1);
  return clamp(100 - visitsToReward * 4, 40, 96);
}

function safetyFromRetained(retained: number) {
  return clamp((retained - 40) * 1.6, 35, 100);
}

function cycleRedemptionsPerCustomer(stampThreshold: number, visitsPerMonth: number) {
  const cycleVisits = stampThreshold + 1;
  return visitsPerMonth / cycleVisits;
}

type StrategyCore = Omit<StrategyRecommendation, "merchant">;

function computeMerchantProjection(
  input: LoyaltyOptimizerInput,
  strategy: StrategyCore,
): MerchantProjection {
  const marginDec = clamp(input.marginPercent, 15, 85) / 100;
  const profitPerVisit = input.avgTicketDzd * marginDec;
  const members = input.monthlyActiveCustomers * PROGRAM_PARTICIPATION_RATE;

  const monthlyGrossMarginDzd =
    input.monthlyActiveCustomers * input.visitsPerMonth * profitPerVisit;
  // Seuls les membres du programme déclenchent des récompenses.
  const monthlyRewardSpendDzd =
    strategy.monthlyRewardCostEstimateDzd * PROGRAM_PARTICIPATION_RATE;
  const monthlyMarginKeptDzd = monthlyGrossMarginDzd - monthlyRewardSpendDzd;

  const baselineRetentionPercent = clamp(
    62 + (input.visitsPerMonth - 4) * 1.4 + (strategy.score - 50) * 0.05,
    55,
    76,
  );
  const retentionUpliftPercent = clamp(
    (strategy.motivationScore / 100) * 11 + (strategy.safetyScore / 100) * 5,
    2,
    16,
  );
  const estimatedRetentionPercent = clamp(
    baselineRetentionPercent + retentionUpliftPercent,
    58,
    90,
  );

  // 1) Clients retenus : seraient partis sans le programme, continuent de visiter.
  const retainedClients = input.monthlyActiveCustomers * (retentionUpliftPercent / 100);
  const monthlyRetentionGainDzd =
    retainedClients * input.visitsPerMonth * RETENTION_VISIT_FACTOR * profitPerVisit;
  // 2) Membres qui reviennent plus souvent grâce à la carte.
  const frequencyGainDzd =
    members * input.visitsPerMonth * MEMBER_FREQUENCY_UPLIFT * profitPerVisit;

  const monthlyLoyaltyGainDzd = monthlyRetentionGainDzd + frequencyGainDzd;
  const yearlyLoyaltyGainDzd = monthlyLoyaltyGainDzd * 12;
  const yearlyRetentionGainDzd = monthlyRetentionGainDzd * 12;

  // Le vrai bilan du programme : ce qu'il rapporte moins ce qu'il coûte.
  const monthlyProgramNetDzd = monthlyLoyaltyGainDzd - monthlyRewardSpendDzd;
  const yearlyProgramNetDzd = monthlyProgramNetDzd * 12;

  const monthlyNetWinDzd = monthlyMarginKeptDzd + monthlyLoyaltyGainDzd;
  const yearlyNetWinDzd = monthlyNetWinDzd * 12;

  // Point mort : combien de visites en plus il faut pour rembourser les récompenses.
  const roiMultiple =
    monthlyRewardSpendDzd > 0 ? monthlyLoyaltyGainDzd / monthlyRewardSpendDzd : 0;
  const breakevenVisitsPerMonth =
    profitPerVisit > 0 ? monthlyRewardSpendDzd / profitPerVisit : 0;
  const projectedExtraVisitsPerMonth =
    profitPerVisit > 0 ? monthlyLoyaltyGainDzd / profitPerVisit : 0;

  return {
    monthlyGrossMarginDzd,
    monthlyRewardSpendDzd,
    monthlyMarginKeptDzd,
    monthlyLoyaltyGainDzd,
    yearlyLoyaltyGainDzd,
    monthlyRetentionGainDzd,
    yearlyRetentionGainDzd,
    monthlyProgramNetDzd,
    yearlyProgramNetDzd,
    monthlyNetWinDzd,
    yearlyNetWinDzd,
    estimatedRetentionPercent,
    retentionUpliftPercent,
    baselineRetentionPercent,
    roiMultiple,
    breakevenVisitsPerMonth,
    projectedExtraVisitsPerMonth,
  };
}

/**
 * Conseils actionnables quand le programme est proche ou en-dessous
 * du point mort (gain ≤ coût des récompenses).
 */
export function buildBreakevenSuggestions(
  input: LoyaltyOptimizerInput,
  strategy: StrategyRecommendation,
): string[] {
  const tips: string[] = [];
  const m = strategy.merchant;
  if (m.roiMultiple >= 1.5) return tips;

  const budget = input.maxRewardBudgetPercent ?? 35;
  if (budget > 25) {
    tips.push(
      `Baissez le budget fidélité max (actuellement ${budget}% de la marge du cycle) vers 20–25 %.`,
    );
  }
  if (strategy.stampsEnabled && (strategy.stampThreshold ?? 0) <= 8) {
    tips.push(
      `Passez de ${strategy.stampThreshold} à ${Math.min((strategy.stampThreshold ?? 8) + 2, 12)} tampons : la récompense arrive un peu plus tard mais coûte moins cher par visite.`,
    );
  }
  if (strategy.effectiveDiscountPercent > MIN_REDUCTION_PCT) {
    tips.push(
      `Réduisez la réduction finale à −${MIN_REDUCTION_PCT}% : c'est le minimum motivant, et chaque point de % économisé va dans votre poche.`,
    );
  }
  if (input.marginPercent < 45) {
    tips.push(
      "Votre marge est serrée : privilégiez des montants DZD fixes plutôt que des % — le coût est connu d'avance.",
    );
  }
  if (input.visitsPerMonth < 3) {
    tips.push(
      "Vos clients viennent rarement : un palier de dépenses (cashback) suit mieux leur rythme qu'une carte à tampons.",
    );
  }
  if (tips.length === 0) {
    tips.push(
      "Testez le scénario alternatif ci-dessous : un mode différent peut franchir le point mort avec les mêmes chiffres.",
    );
  }
  return tips;
}

function withMerchantProjection(
  input: LoyaltyOptimizerInput,
  strategy: StrategyCore,
): StrategyRecommendation {
  return { ...strategy, merchant: computeMerchantProjection(input, strategy) };
}

function getTierContext(input: LoyaltyOptimizerInput) {
  const mode = input.ticketTierMode ?? "auto";
  const ticketTier = resolveTicketTier(input.avgTicketDzd, mode);
  const tierConfig = getTicketTierConfig(ticketTier);
  return { ticketTier, tierConfig, mode };
}

function uniqueMilestonePositions(threshold: number, count: 1 | 2 | 3): number[] {
  const raw =
    count === 1
      ? [Math.max(2, Math.round(threshold * 0.55))]
      : count === 3
      ? [
          Math.max(2, Math.round(threshold * 0.33)),
          Math.max(3, Math.round(threshold * 0.55)),
          Math.max(4, Math.round(threshold * 0.78)),
        ]
      : [
          Math.max(2, Math.round(threshold * 0.4)),
          Math.max(3, Math.round(threshold * 0.72)),
        ];

  const seen = new Set<number>();
  const positions: number[] = [];
  for (const p of raw) {
    const pos = clamp(p, 1, threshold - 1);
    if (!seen.has(pos)) {
      seen.add(pos);
      positions.push(pos);
    }
  }
  return positions.sort((a, b) => a - b);
}

/** Part du panier offerte au jalon "dernière ligne droite" (avant-dernier tampon). */
const FINAL_STRETCH_AMOUNT_RATIO = 0.12;

/**
 * Motivateur systématique sur l'avant-dernier tampon : un petit montant
 * exact qui pousse le client à finir sa carte.
 */
function buildFinalStretchMilestone(
  threshold: number,
  avgTicketDzd: number,
): MilestoneSuggestion {
  const amount = roundRewardAmountDzd(avgTicketDzd * FINAL_STRETCH_AMOUNT_RATIO);
  return {
    position: threshold - 1,
    label: `${formatDzd(amount)} offerts — plus qu'1 tampon !`,
    kind: "fixed" as const,
    amountDzd: amount,
  };
}

/** Tous les jalons sont mesurables : montant DZD exact ou % précis. */
function buildStampMilestones(
  threshold: number,
  avgTicketDzd: number,
  tier: ReturnType<typeof getTicketTierConfig>,
  options?: { milestoneCount?: 1 | 2 | 3; includeFinalStretch?: boolean },
): MilestoneSuggestion[] {
  const milestoneCount = Math.min(
    options?.milestoneCount ?? tier.milestoneCount,
    tier.milestoneCount,
  ) as 1 | 2 | 3;
  const includeFinalStretch = options?.includeFinalStretch ?? true;
  const fixedMilestone = (position: number, i: number): MilestoneSuggestion => {
    const ratio =
      tier.milestoneAmountRatios[i] ??
      tier.milestoneAmountRatios[tier.milestoneAmountRatios.length - 1] ??
      0.25;
    const amount = roundRewardAmountDzd(avgTicketDzd * ratio);
    return {
      position,
      label: `${formatDzd(amount)} offerts`,
      kind: "fixed" as const,
      amountDzd: amount,
    };
  };

  const spread: MilestoneSuggestion[] =
    threshold >= 6 && milestoneCount > 0
      ? uniqueMilestonePositions(threshold, milestoneCount).map((position, i) => {
          if (!tier.allowPercentReduction || tier.rewardProfile === "fixed") {
            return fixedMilestone(position, i);
          }
          if (tier.rewardProfile === "mixed") {
            const isLast = i === milestoneCount - 1;
            if (isLast) {
              const pct = milestoneReductionForTier(0, tier);
              return {
                position,
                label: `-${pct}%`,
                kind: "percent" as const,
                discountPercent: pct,
              };
            }
            return fixedMilestone(position, i);
          }
          const pct = milestoneReductionForTier(i, tier);
          return {
            position,
            label: `-${pct}% sur le panier`,
            kind: "percent" as const,
            discountPercent: pct,
          };
        })
      : [];

  if (!includeFinalStretch) {
    return spread.sort((a, b) => a.position - b.position);
  }

  const finalStretch = buildFinalStretchMilestone(threshold, avgTicketDzd);
  const withoutClash = spread.filter((m) => m.position !== finalStretch.position);
  return [...withoutClash, finalStretch].sort((a, b) => a.position - b.position);
}

function calcFinalDiscountPercent(
  stampThreshold: number,
  avgTicketDzd: number,
  rewardCostDzd: number,
  tier: ReturnType<typeof getTicketTierConfig>,
  budgetFraction: number,
  marginDec: number,
): number {
  if (!tier.allowPercentReduction) return 0;

  const cycleSpend = stampThreshold * avgTicketDzd;
  const rawPct = (rewardCostDzd / Math.max(cycleSpend, 1)) * 100;
  const computedMax = snapReductionPercent(
    marginDec * budgetFraction * 100 * 1.2,
    tier.minReductionPct,
    tier.maxReductionPct,
  );
  return snapReductionPercent(
    Math.min(rawPct, computedMax),
    tier.minReductionPct,
    tier.maxReductionPct,
  );
}

function buildStampsStrategy(
  input: LoyaltyOptimizerInput,
  profitPerVisit: number,
  budgetFraction: number,
  rewardMultiplier: number,
): StrategyCore {
  const { ticketTier, tierConfig: tier } = getTierContext(input);
  const profile = tier.rewardProfile;
  const marginDec = clamp(input.marginPercent, 15, 85) / 100;
  const policy = getLowMarginStampPolicy(input.marginPercent);
  const effectiveBudget = budgetFraction * policy.budgetScale;

  let stampThreshold = policy.minStamps;
  let thresholdFloor = policy.minStamps;
  let strategyCore: StrategyCore | null = null;

  for (let attempt = 0; attempt < NICE_STAMPS.length; attempt++) {
    const seededRewardCost = roundRewardAmountDzd(
      REFERENCE_CYCLE_STAMPS * profitPerVisit * effectiveBudget * rewardMultiplier,
    );
    const scaledFinalAmountDzd = roundRewardAmountDzd(
      input.avgTicketDzd * tier.finalAmountRatio * policy.rewardScale * rewardMultiplier,
    );
    const maxRewardFromCycleMargin = roundRewardAmountDzd(
      stampThreshold * profitPerVisit * effectiveBudget * rewardMultiplier,
    );

    const adjustedRewardCost =
      tier.finalRewardType === "fixed_dzd"
        ? Math.min(seededRewardCost, scaledFinalAmountDzd, maxRewardFromCycleMargin)
        : Math.min(seededRewardCost, maxRewardFromCycleMargin);

    const rawMin = adjustedRewardCost / (effectiveBudget * profitPerVisit);
    stampThreshold = pickStampThreshold(rawMin, profitPerVisit, adjustedRewardCost, {
      minStamps: thresholdFloor,
      minRetainedPercent: policy.minRetainedPercent,
    });

    const maxRewardFromCycleMarginFinal = roundRewardAmountDzd(
      stampThreshold * profitPerVisit * effectiveBudget * rewardMultiplier,
    );
    const finalRewardCost =
      tier.finalRewardType === "fixed_dzd"
        ? Math.min(seededRewardCost, scaledFinalAmountDzd, maxRewardFromCycleMarginFinal)
        : Math.min(seededRewardCost, maxRewardFromCycleMarginFinal);

    const milestones = buildStampMilestones(stampThreshold, input.avgTicketDzd, tier, {
      milestoneCount: policy.maxMilestones,
      includeFinalStretch: policy.includeFinalStretch,
    });
    const effectiveDiscountPercent = calcFinalDiscountPercent(
      stampThreshold,
      input.avgTicketDzd,
      finalRewardCost,
      tier,
      effectiveBudget,
      marginDec,
    );

    const grossMarginPerCycleDzd = stampThreshold * profitPerVisit;
    const netMarginPerCycleDzd = grossMarginPerCycleDzd - finalRewardCost;
    const marginRetainedPercent =
      grossMarginPerCycleDzd > 0 ? (netMarginPerCycleDzd / grossMarginPerCycleDzd) * 100 : 0;

    const rewardLabel =
      tier.finalRewardType === "fixed_dzd"
        ? `${formatDzd(Math.min(scaledFinalAmountDzd, finalRewardCost))} offerts`
        : `Réduction finale −${effectiveDiscountPercent}%`;

    const cardMilestones = withGrandPrizeOnFinalStamp(milestones, stampThreshold, rewardLabel);

    const milestoneHint =
      cardMilestones.length > 0
        ? ` + ${cardMilestones.length} jalon${cardMilestones.length > 1 ? "s" : ""} sur la carte`
        : "";

    const customerPitch =
      tier.finalRewardType === "fixed_dzd"
        ? `${stampThreshold} tampons → ${formatDzd(Math.min(scaledFinalAmountDzd, finalRewardCost))} offerts${milestoneHint}`
        : `Collectez ${stampThreshold} tampons → −${effectiveDiscountPercent}% à la fin${milestoneHint}`;

    const redemptions = cycleRedemptionsPerCustomer(stampThreshold, input.visitsPerMonth);
    const milestoneCostFactor = 1 + cardMilestones.length * 0.12;
    const monthlyRewardCostEstimateDzd =
      input.monthlyActiveCustomers * redemptions * finalRewardCost * milestoneCostFactor;

    const motivationScore =
      motivationFromStamps(stampThreshold) + clamp(cardMilestones.length * 4, 0, 12);
    const safetyScore = safetyFromRetained(marginRetainedPercent);
    const score = motivationScore * 0.55 + safetyScore * 0.45;

    const marginNote =
      input.marginPercent < 48
        ? ` Cycle allongé (${stampThreshold} tampons) pour protéger votre marge.`
        : "";
    const whySuffix = ` ${tier.ruleSummary}${marginNote}`;

    strategyCore = {
      id: "stamps",
      rank: 0,
      score,
      title: rewardMultiplier > 1 ? "Tampons + montant majoré" : "Programme tampons",
      badge: `${tier.label} · ${cardMilestones.length} jalons`,
      mode: "stamps",
      stampsEnabled: true,
      spendEnabled: false,
      stampThreshold,
      rewardDescription: rewardLabel,
      customerPitch,
      effectiveDiscountPercent,
      rewardCostDzd: finalRewardCost,
      grossMarginPerCycleDzd,
      netMarginPerCycleDzd,
      marginRetainedPercent,
      motivationScore: clamp(motivationScore, 42, 100),
      safetyScore,
      milestones: cardMilestones.length ? cardMilestones : undefined,
      rewardProfile: profile,
      ticketTier,
      whyItWorks: `${stampThreshold} tampons (${tier.label}). Vous gardez ${marginRetainedPercent.toFixed(0)}% de marge.${whySuffix}`,
      monthlyRewardCostEstimateDzd,
    };

    const net = computeMerchantProjection(input, strategyCore).monthlyProgramNetDzd;
    const motivatedEnough = strategyCore.motivationScore >= 46;
    if (net >= 0 && motivatedEnough) break;
    if (stampThreshold >= 12) break;
    if (net >= 0 && !motivatedEnough && stampThreshold <= policy.minStamps + 1) break;

    const idx = NICE_STAMPS.indexOf(stampThreshold as (typeof NICE_STAMPS)[number]);
    const next = idx >= 0 ? NICE_STAMPS[idx + 1] : undefined;
    if (!next) break;
    thresholdFloor = next;
    stampThreshold = next;
  }

  return strategyCore!;
}

function buildSpendStrategy(
  input: LoyaltyOptimizerInput,
  profitPerVisit: number,
  marginDec: number,
  budgetFraction: number,
): StrategyCore {
  const { ticketTier, tierConfig: tier } = getTierContext(input);
  const profile = tier.rewardProfile;
  const policy = getLowMarginStampPolicy(input.marginPercent);
  const effectiveBudget = budgetFraction * policy.budgetScale;
  const visitMultiplier = input.marginPercent < 40 ? 2.8 : input.marginPercent < 48 ? 2.5 : 2.2;
  const targetVisits = clamp(Math.round(input.visitsPerMonth * visitMultiplier), 6, 16);
  const rawThreshold = input.avgTicketDzd * targetVisits;
  const spendThresholdDzd = roundToNice(rawThreshold, NICE_SPEND);

  const maxCashbackPct = marginDec * effectiveBudget * 100;
  const effectiveDiscountPercent =
    tier.allowPercentReduction && tier.cashbackMaxPct > 0
      ? snapReductionPercent(
          Math.min(maxCashbackPct, tier.cashbackMaxPct),
          tier.minReductionPct,
          tier.maxReductionPct,
        )
      : 0;
  // Sans % autorisé : montant exact offert, arrondi à 50 DZD.
  const fixedSpendRewardDzd = roundRewardAmountDzd(
    Math.min(
      input.avgTicketDzd * tier.finalAmountRatio * policy.rewardScale,
      spendThresholdDzd * 0.12 * policy.budgetScale,
    ),
  );
  const rewardCostDzd =
    effectiveDiscountPercent > 0
      ? spendThresholdDzd * (effectiveDiscountPercent / 100)
      : fixedSpendRewardDzd;

  const grossMarginPerCycleDzd = spendThresholdDzd * marginDec;
  const netMarginPerCycleDzd = grossMarginPerCycleDzd - rewardCostDzd;
  const marginRetainedPercent =
    grossMarginPerCycleDzd > 0 ? (netMarginPerCycleDzd / grossMarginPerCycleDzd) * 100 : 0;

  const cycleMonths = spendThresholdDzd / (input.avgTicketDzd * Math.max(input.visitsPerMonth, 1));
  const monthlyRewardCostEstimateDzd =
    (input.monthlyActiveCustomers / Math.max(cycleMonths, 0.5)) * rewardCostDzd;

  const motivationScore = motivationFromSpend(spendThresholdDzd, input.avgTicketDzd);
  const safetyScore = safetyFromRetained(marginRetainedPercent);
  const score = motivationScore * 0.52 + safetyScore * 0.48;

  const rewardDescription =
    effectiveDiscountPercent > 0
      ? `${formatDzd(Math.round(rewardCostDzd))} de réduction (−${effectiveDiscountPercent}%)`
      : `${formatDzd(fixedSpendRewardDzd)} offerts`;

  const customerPitch = `À ${formatDzd(spendThresholdDzd)} dépensés → ${formatDzd(Math.round(rewardCostDzd))} offerts`;

  return {
    id: "spend",
    rank: 0,
    score,
    title: tier.allowPercentReduction ? "Cashback / palier de dépenses" : "Palier + montant offert",
    badge: `${tier.label} · palier DZD`,
    mode: "spend",
    stampsEnabled: false,
    spendEnabled: true,
    spendThresholdDzd,
    rewardDescription,
    customerPitch,
    effectiveDiscountPercent,
    rewardCostDzd,
    grossMarginPerCycleDzd,
    netMarginPerCycleDzd,
    marginRetainedPercent,
    motivationScore,
    safetyScore,
    rewardProfile: profile,
    ticketTier,
    whyItWorks: `Palier atteint en ~${targetVisits} visites (${tier.label}). ${tier.ruleSummary}`,
    monthlyRewardCostEstimateDzd,
  };
}

function buildHybridStrategy(
  stamps: StrategyCore,
  spend: StrategyCore,
  input: LoyaltyOptimizerInput,
): StrategyCore {
  const stampThreshold = stamps.stampThreshold ?? 8;
  const spendThresholdDzd = spend.spendThresholdDzd ?? 10000;
  const combinedRewardCost = stamps.rewardCostDzd * 0.55 + spend.rewardCostDzd * 0.45;
  const grossMarginPerCycleDzd = stamps.grossMarginPerCycleDzd * 0.6 + spend.grossMarginPerCycleDzd * 0.4;
  const netMarginPerCycleDzd = grossMarginPerCycleDzd - combinedRewardCost * 0.7;
  const marginRetainedPercent =
    grossMarginPerCycleDzd > 0 ? (netMarginPerCycleDzd / grossMarginPerCycleDzd) * 100 : 0;

  const motivationScore = stamps.motivationScore * 0.5 + spend.motivationScore * 0.5;
  const safetyScore = safetyFromRetained(marginRetainedPercent);
  const score = motivationScore * 0.58 + safetyScore * 0.42;

  return {
    id: "hybrid",
    rank: 0,
    score,
    title: "Double programme (tampons + cashback)",
    badge: "Maximum d'engagement",
    mode: "both",
    stampsEnabled: true,
    spendEnabled: true,
    stampThreshold,
    spendThresholdDzd,
    rewardDescription: `${stamps.rewardDescription} + palier ${formatDzd(spendThresholdDzd)}`,
    customerPitch: `Tampons (${stampThreshold}) pour les habitués + palier dépenses pour les gros paniers`,
    // Le tier symbolique interdit les % : ne pas forcer un minimum de 10 %.
    effectiveDiscountPercent: Math.max(
      stamps.effectiveDiscountPercent,
      spend.effectiveDiscountPercent,
    ),
    rewardCostDzd: combinedRewardCost,
    grossMarginPerCycleDzd,
    netMarginPerCycleDzd,
    marginRetainedPercent,
    motivationScore,
    safetyScore,
    milestones: stamps.milestones,
    rewardProfile: stamps.rewardProfile,
    ticketTier: stamps.ticketTier,
    whyItWorks: `Combine tampons (${stampThreshold}, ${stamps.milestones?.length ?? 0} jalons) et cashback. ${stamps.whyItWorks.split(".")[0]}.`,
    monthlyRewardCostEstimateDzd:
      stamps.monthlyRewardCostEstimateDzd * 0.65 + spend.monthlyRewardCostEstimateDzd * 0.35,
  };
}

export function optimizeLoyaltyProgram(rawInput: LoyaltyOptimizerInput): OptimizerResult {
  // Segment forcé : le prix utilisé dans tous les calculs est ramené
  // dans la fourchette du niveau de panier choisi.
  const mode = rawInput.ticketTierMode ?? "auto";
  const effectiveTicketDzd =
    mode === "auto"
      ? rawInput.avgTicketDzd
      : clampTicketToTier(rawInput.avgTicketDzd, mode);
  const input: LoyaltyOptimizerInput = { ...rawInput, avgTicketDzd: effectiveTicketDzd };

  const marginDec = clamp(input.marginPercent, 15, 85) / 100;
  const budgetFraction = clamp(input.maxRewardBudgetPercent ?? 35, 20, 50) / 100;
  const profitPerVisit = input.avgTicketDzd * marginDec;

  const stampsClassic = buildStampsStrategy(input, profitPerVisit, budgetFraction, 1);
  const stampsProduct = buildStampsStrategy(input, profitPerVisit, budgetFraction, 1.25);
  const spend = buildSpendStrategy(input, profitPerVisit, marginDec, budgetFraction);
  const hybrid = buildHybridStrategy(stampsClassic, spend, input);

  let candidates: StrategyCore[] = [];

  switch (input.rewardPreference) {
    case "stamps":
      candidates = [stampsClassic, hybrid];
      break;
    case "cashback":
      candidates = [spend, hybrid];
      break;
    case "free_product":
      candidates =
        input.marginPercent < 45
          ? [stampsClassic, spend]
          : [stampsProduct, stampsClassic];
      break;
    default:
      candidates = [stampsClassic, spend, hybrid, stampsProduct];
  }

  const unique = new Map<string, StrategyCore>();
  for (const c of candidates) {
    const key = `${c.mode}-${c.stampThreshold}-${c.spendThresholdDzd}`;
    if (!unique.has(key) || (unique.get(key)!.score < c.score)) {
      unique.set(key, c);
    }
  }

  const strategies = [...unique.values()]
    .map((s) => withMerchantProjection(input, { ...s, rank: 0 }))
    .sort((a, b) => computeSweetSpotScore(b) - computeSweetSpotScore(a))
    .map((s, i) => ({ ...s, rank: i + 1 }));

  const best = strategies[0];

  const insights: string[] = [];
  const { tierConfig } = getTierContext(input);

  insights.push(`Segment panier : ${tierConfig.label} (${tierConfig.rangeLabel}). ${tierConfig.ruleSummary}`);
  if (effectiveTicketDzd !== rawInput.avgTicketDzd) {
    insights.push(
      `Panier ajusté : ${formatDzd(rawInput.avgTicketDzd)} saisi → ${formatDzd(effectiveTicketDzd)} utilisé pour coller au segment ${tierConfig.label.toLowerCase()}.`,
    );
  }
  if (best.stampsEnabled && best.milestones && best.milestones.length >= 2) {
    const jalonList = best.milestones.map((m) => `tampon ${m.position} : ${m.label}`).join(" · ");
    insights.push(`${best.milestones.length} jalons sur la carte — ${jalonList}.`);
  }
  if (best.stampsEnabled && best.rewardProfile !== "fixed" && best.effectiveDiscountPercent > 0) {
    insights.push(
      `Réduction finale : −${best.effectiveDiscountPercent}% (plafond ${tierConfig.maxReductionPct}% pour ${tierConfig.label.toLowerCase()}).`,
    );
  }
  if (input.marginPercent < 40) {
    insights.push(
      "Marge brute faible : privilégiez des paliers un peu plus hauts ou des récompenses symboliques (boisson, dessert).",
    );
  }
  if (input.marginPercent < 48 && best.stampsEnabled && (best.stampThreshold ?? 0) >= 8) {
    insights.push(
      `Marge serrée : Pulse étire le cycle à ${best.stampThreshold} tampons et réduit les jalons pour garder un profit net positif.`,
    );
  }
  if (input.visitsPerMonth >= 8) {
    insights.push(
      "Clientèle très régulière : les tampons courts (6–8) performent souvent mieux que le cashback.",
    );
  }
  if (input.avgTicketDzd >= 2000) {
    insights.push(
      "Panier moyen élevé : un palier de dépenses en DZD rassure le client sur la valeur gagnée.",
    );
  }
  if (best.marginRetainedPercent >= 60) {
    insights.push(
      `Votre meilleur scénario préserve ${best.marginRetainedPercent.toFixed(0)}% de la marge brute du cycle — zone saine pour durer.`,
    );
  }
  if (best.merchant.retentionUpliftPercent >= 6) {
    insights.push(
      `Rétention estimée +${best.merchant.retentionUpliftPercent.toFixed(0)} pts (${best.merchant.estimatedRetentionPercent.toFixed(0)}% de clients fidèles) — les clients qui reviennent rapportent environ ${formatDzd(Math.round(best.merchant.monthlyLoyaltyGainDzd))}/mois de marge.`,
    );
  }
  if (best.merchant.monthlyProgramNetDzd > 0) {
    insights.push(
      `Bilan du programme : +${formatDzd(Math.round(best.merchant.monthlyProgramNetDzd))}/mois (${formatDzd(Math.round(best.merchant.yearlyProgramNetDzd))}/an) une fois les récompenses payées.`,
    );
  } else {
    insights.push(
      "Ce scénario coûte plus qu'il ne rapporte : augmentez légèrement le palier ou baissez le budget récompenses.",
    );
  }

  const breakevenSuggestions = buildBreakevenSuggestions(input, best);

  return { strategies, best, insights, breakevenSuggestions };
}
