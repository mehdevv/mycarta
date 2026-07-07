/**
 * Règle Pulse : toutes les récompenses sont mesurables — soit un montant
 * exact en DZD, soit un pourcentage précis. Jamais de cadeau flou.
 */
export type RewardProfile = "fixed" | "mixed" | "percent";

export type TicketTier = "low" | "normal" | "high" | "super_high";
export type TicketTierMode = "auto" | TicketTier;

export interface TicketTierConfig {
  tier: TicketTier;
  label: string;
  rangeLabel: string;
  minDzd: number;
  maxDzd: number | null;
  rewardProfile: RewardProfile;
  allowPercentReduction: boolean;
  minReductionPct: number;
  maxReductionPct: number;
  milestoneCount: 2 | 3;
  /** "fixed_dzd" = montant exact offert, "percent" = réduction en %. */
  finalRewardType: "fixed_dzd" | "percent";
  /** Parts du panier moyen utilisées pour les jalons en DZD (arrondies). */
  milestoneAmountRatios: number[];
  /** Part du panier moyen offerte en récompense finale (type fixed_dzd). */
  finalAmountRatio: number;
  cashbackMaxPct: number;
  ruleSummary: string;
}

export const TICKET_TIER_ORDER: TicketTier[] = ["low", "normal", "high", "super_high"];

export const TICKET_TIER_CONFIG: Record<TicketTier, TicketTierConfig> = {
  low: {
    tier: "low",
    label: "Petit panier",
    rangeLabel: "< 400 DZD",
    minDzd: 0,
    maxDzd: 399,
    rewardProfile: "fixed",
    allowPercentReduction: false,
    minReductionPct: 0,
    maxReductionPct: 0,
    milestoneCount: 3,
    finalRewardType: "fixed_dzd",
    milestoneAmountRatios: [0.2, 0.3, 0.45],
    finalAmountRatio: 1,
    cashbackMaxPct: 0,
    ruleSummary:
      "Petit panier : récompenses en montants exacts (ex. 100 DZD offerts) — un % serait trop faible pour motiver.",
  },
  normal: {
    tier: "normal",
    label: "Panier normal",
    rangeLabel: "400 – 899 DZD",
    minDzd: 400,
    maxDzd: 899,
    rewardProfile: "mixed",
    allowPercentReduction: true,
    minReductionPct: 10,
    maxReductionPct: 15,
    milestoneCount: 3,
    finalRewardType: "percent",
    milestoneAmountRatios: [0.25, 0.35],
    finalAmountRatio: 0.5,
    cashbackMaxPct: 15,
    ruleSummary:
      "Panier moyen : jalons en DZD exacts + réduction finale 10–15 %.",
  },
  high: {
    tier: "high",
    label: "Gros panier",
    rangeLabel: "900 – 2 499 DZD",
    minDzd: 900,
    maxDzd: 2499,
    rewardProfile: "percent",
    allowPercentReduction: true,
    minReductionPct: 10,
    maxReductionPct: 15,
    milestoneCount: 2,
    finalRewardType: "percent",
    milestoneAmountRatios: [],
    finalAmountRatio: 0.55,
    cashbackMaxPct: 15,
    ruleSummary:
      "Gros panier : réductions légères uniquement (10–15 %) — le montant en DZD suffit à motiver.",
  },
  super_high: {
    tier: "super_high",
    label: "Très gros panier",
    rangeLabel: "≥ 2 500 DZD",
    minDzd: 2500,
    maxDzd: null,
    rewardProfile: "percent",
    allowPercentReduction: true,
    minReductionPct: 10,
    maxReductionPct: 10,
    milestoneCount: 2,
    finalRewardType: "percent",
    milestoneAmountRatios: [],
    finalAmountRatio: 0.45,
    cashbackMaxPct: 10,
    ruleSummary:
      "Très gros panier : réduction fixée à 10 % maximum — protéger la valeur perçue du service.",
  },
};

export function detectTicketTier(avgTicketDzd: number): TicketTier {
  if (avgTicketDzd < TICKET_TIER_CONFIG.normal.minDzd) return "low";
  if (avgTicketDzd < TICKET_TIER_CONFIG.high.minDzd) return "normal";
  if (avgTicketDzd < TICKET_TIER_CONFIG.super_high.minDzd) return "high";
  return "super_high";
}

export function resolveTicketTier(avgTicketDzd: number, mode: TicketTierMode = "auto"): TicketTier {
  if (mode !== "auto") return mode;
  return detectTicketTier(avgTicketDzd);
}

export function getTicketTierConfig(tier: TicketTier): TicketTierConfig {
  return TICKET_TIER_CONFIG[tier];
}

/** Montant DZD "propre" : arrondi au multiple de 50, minimum 50. */
export function roundRewardAmountDzd(raw: number): number {
  return Math.max(50, Math.round(raw / 50) * 50);
}

/**
 * Aligne le panier utilisé dans les calculs sur le segment choisi :
 * un prix hors plage est ramené dans la fourchette du tier.
 */
export function clampTicketToTier(avgTicketDzd: number, tier: TicketTier): number {
  const cfg = TICKET_TIER_CONFIG[tier];
  const min = Math.max(cfg.minDzd, 50);
  const max = cfg.maxDzd ?? Number.POSITIVE_INFINITY;
  return Math.min(max, Math.max(min, avgTicketDzd));
}

export const TICKET_TIER_FILTER_OPTIONS: { value: TicketTierMode; title: string; hint: string }[] =
  [
    { value: "auto", title: "Auto", hint: "Selon votre panier moyen" },
    { value: "low", title: "Petit panier", hint: TICKET_TIER_CONFIG.low.rangeLabel },
    { value: "normal", title: "Normal", hint: TICKET_TIER_CONFIG.normal.rangeLabel },
    { value: "high", title: "Gros panier", hint: TICKET_TIER_CONFIG.high.rangeLabel },
    {
      value: "super_high",
      title: "Très gros",
      hint: TICKET_TIER_CONFIG.super_high.rangeLabel,
    },
  ];
