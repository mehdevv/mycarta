function toCamel<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = value;
  }
  return out;
}

import { parseStampMilestones } from "@/lib/stamp-milestones";

export function mapSettings(row: Record<string, unknown>) {
  const r = toCamel(row);
  return {
    id: r.id as string,
    businessName: r.businessName as string,
    logoUrl: (r.logoUrl as string) ?? null,
    cardTemplateUrl: (r.cardTemplateUrl as string) ?? null,
    primaryColor: r.primaryColor as string,
    secondaryColor: r.secondaryColor as string,
    currency: r.currency as string,
    timezone: r.timezone as string,
    stampThreshold: r.stampThreshold as number,
    maxScansPerDay: r.maxScansPerDay as number,
    rewardType: r.rewardType as string,
    rewardValue: (r.rewardValue as string) ?? null,
    stampMilestones: parseStampMilestones(r.stampMilestones),
    trackProducts: r.trackProducts as boolean,
    whatsappToken: r.whatsappToken as string | null,
    whatsappPhoneId: r.whatsappPhoneId as string | null,
    emailSender: r.emailSender as string | null,
    whatsappConfigured: Boolean(r.whatsappToken && r.whatsappPhoneId),
    emailConfigured: Boolean(r.emailSender),
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
    totalRewardsEarned: r.totalRewardsEarned as number,
    enrolledAt: r.enrolledAt as string,
    lastScanAt: (r.lastScanAt as string) ?? null,
    notes: (r.notes as string) ?? null,
    isBlocked: r.isBlocked as boolean,
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
