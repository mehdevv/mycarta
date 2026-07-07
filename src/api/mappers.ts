function toCamel<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = value;
  }
  return out;
}

import { parseStampMilestones } from "@/lib/stamp-milestones";
import { parseSocialLinks } from "@/lib/social-links";
import { DEFAULT_CARD_DESIGN_ID } from "@/lib/card-templates";
import { resolveLoyaltyFlags } from "@/lib/loyalty-program";

export function mapSettings(row: Record<string, unknown>) {
  const r = toCamel(row);
  return {
    id: r.id as string,
    tenantId: r.tenantId as string,
    businessName: r.businessName as string,
    logoUrl: (r.logoUrl as string) ?? null,
    cardTemplateUrl: (r.cardTemplateUrl as string) ?? null,
    cardDesignId:
      r.cardDesignId != null && String(r.cardDesignId).trim() !== ""
        ? String(r.cardDesignId)
        : DEFAULT_CARD_DESIGN_ID,
    primaryColor: r.primaryColor as string,
    secondaryColor: r.secondaryColor as string,
    currency: r.currency as string,
    timezone: r.timezone as string,
    ...(() => {
      const flags = resolveLoyaltyFlags({
        stampsEnabled: r.stampsEnabled as boolean | undefined,
        spendEnabled: r.spendEnabled as boolean | undefined,
        rewardMode: r.rewardMode as string | undefined,
      });
      return { stampsEnabled: flags.stampsEnabled, spendEnabled: flags.spendEnabled };
    })(),
    stampThreshold: r.stampThreshold as number,
    spendThresholdDzd: Number(r.spendThresholdDzd ?? 10000),
    maxScansPerDay: r.maxScansPerDay as number,
    rewardType: r.rewardType as string,
    rewardValue: (r.rewardValue as string) ?? null,
    stampMilestones: parseStampMilestones(r.stampMilestones),
    trackProducts: r.trackProducts as boolean,
    collectClientEmail: r.collectClientEmail === true,
    whatsappToken: r.whatsappToken as string | null,
    whatsappPhoneId: r.whatsappPhoneId as string | null,
    emailSender: r.emailSender as string | null,
    whatsappConfigured: Boolean(r.whatsappToken && r.whatsappPhoneId),
    emailConfigured: Boolean(r.emailSender),
    clientLanguage: r.clientLanguage === "en" ? "en" : "fr",
    socialLinks: parseSocialLinks(r.socialLinks),
    updatedAt: String(r.updatedAt ?? r.createdAt ?? new Date().toISOString()),
  };
}

export function mapClient(row: Record<string, unknown>) {
  const r = toCamel(row);
  return {
    id: r.id as string,
    fullName: r.fullName as string,
    phone: (r.phone as string) ?? null,
    email: (r.email as string) ?? null,
    cardCode: (r.cardCode ?? r.fidelityQrToken) as string,
    totalStamps: r.totalStamps as number,
    currentCycleStamps: r.currentCycleStamps as number,
    currentCycleSpendDzd: Number(r.currentCycleSpendDzd ?? 0),
    totalSpendDzd: Number(r.totalSpendDzd ?? 0),
    totalRewardsEarned: r.totalRewardsEarned as number,
    enrolledAt: r.enrolledAt as string,
    lastScanAt: (r.lastScanAt as string) ?? null,
    notes: (r.notes as string) ?? null,
    isBlocked: r.isBlocked as boolean,
  };
}

export function mapClientCardReward(item: Record<string, unknown>) {
  const r = toCamel(item);
  return {
    id: String(r.id ?? ""),
    rewardDescription: String(r.rewardDescription ?? "Reward"),
    createdAt: String(r.createdAt ?? new Date().toISOString()),
    redeemedAt: (r.redeemedAt as string | null) ?? null,
  };
}

export function mapClientCard(raw: Record<string, unknown>) {
  const r = toCamel(raw);

  let rewards = Array.isArray(r.rewards)
    ? r.rewards
        .map((item) => mapClientCardReward(item as Record<string, unknown>))
        .filter((reward) => reward.id)
    : [];

  const pendingId = (r.pendingRewardId as string | null) ?? null;
  const pendingDesc = (r.pendingRewardDescription as string | null) ?? null;

  if (pendingId && !rewards.some((reward) => reward.id === pendingId)) {
    rewards = [
      {
        id: pendingId,
        rewardDescription: pendingDesc ?? "Reward",
        createdAt: new Date().toISOString(),
        redeemedAt: null,
      },
      ...rewards,
    ];
  }

  return {
    businessName: String(r.businessName ?? ""),
    clientName: String(r.clientName ?? ""),
    clientPhone: (r.clientPhone as string | null) ?? null,
    primaryColor: String(r.primaryColor ?? "#1A56DB"),
    cardUrl: (r.cardUrl as string) ?? null,
    cardTemplateUrl: (r.cardTemplateUrl as string) ?? null,
    cardDesignId:
      r.cardDesignId != null && String(r.cardDesignId).trim() !== ""
        ? String(r.cardDesignId)
        : undefined,
    ...(() => {
      const flags = resolveLoyaltyFlags({
        stampsEnabled: r.stampsEnabled as boolean | undefined,
        spendEnabled: r.spendEnabled as boolean | undefined,
        rewardMode: r.rewardMode as string | undefined,
      });
      return {
        stampsEnabled: flags.stampsEnabled,
        spendEnabled: flags.spendEnabled,
        rewardMode:
          flags.stampsEnabled && flags.spendEnabled
            ? "both"
            : flags.spendEnabled
              ? "spend"
              : "stamps",
      } as const;
    })(),
    stampThreshold: Number(r.stampThreshold ?? 9),
    currentCycleStamps: Number(r.currentCycleStamps ?? 0),
    spendThresholdDzd: Number(r.spendThresholdDzd ?? 10000),
    currentCycleSpendDzd: Number(r.currentCycleSpendDzd ?? 0),
    rewardValue: (r.rewardValue as string | null) ?? null,
    cardCode: String(r.cardCode ?? ""),
    stampMilestones: parseStampMilestones(r.stampMilestones),
    pendingRewardId: pendingId,
    pendingRewardDescription: pendingDesc,
    showCartaWatermark: Boolean(r.showCartaWatermark),
    socialLinks: parseSocialLinks(r.socialLinks),
    rewards,
    recentScans: Array.isArray(r.recentScans)
      ? (r.recentScans as Record<string, unknown>[]).map((scan) => {
          const s = toCamel(scan);
          return {
            scannedAt: String(s.scannedAt ?? ""),
            status: String(s.status ?? ""),
            stampsAdded: Number(s.stampsAdded ?? 0),
            spendAddedDzd: Number(s.spendAddedDzd ?? 0),
          };
        })
      : [],
    maxScansPerDay: Number(r.maxScansPerDay ?? 2),
    scansToday: Number(r.scansToday ?? 0),
    scansResetAt: (r.scansResetAt as string | null) ?? null,
  };
}

export function mapProduct(row: Record<string, unknown>) {
  const r = toCamel(row);
  return {
    id: r.id as string,
    name: r.name as string,
    sku: (r.sku as string) ?? null,
    category: (r.category as string) ?? null,
    price: Number(r.price),
    isActive: r.isActive as boolean,
  };
}

export function snakeCaseKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    const snake = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    out[snake] = value;
  }
  return out;
}
