import type { PlanId } from "@/lib/pricing";
import { getPlanQuotas } from "@/lib/pricing";

const AI_PROMPTS_STORAGE_KEY = "carta-ai-prompts";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

type StoredAiUsage = {
  date: string;
  count: number;
};

function readStoredUsage(tenantId: string): StoredAiUsage {
  if (typeof window === "undefined") return { date: todayKey(), count: 0 };
  try {
    const raw = localStorage.getItem(`${AI_PROMPTS_STORAGE_KEY}:${tenantId}`);
    if (!raw) return { date: todayKey(), count: 0 };
    const parsed = JSON.parse(raw) as StoredAiUsage;
    if (parsed.date !== todayKey()) return { date: todayKey(), count: 0 };
    return { date: parsed.date, count: Number(parsed.count) || 0 };
  } catch {
    return { date: todayKey(), count: 0 };
  }
}

export function readAiPromptUsage(tenantId: string): number {
  return readStoredUsage(tenantId).count;
}

export function incrementAiPromptUsage(tenantId: string): number {
  const next = readAiPromptUsage(tenantId) + 1;
  if (typeof window !== "undefined") {
    localStorage.setItem(
      `${AI_PROMPTS_STORAGE_KEY}:${tenantId}`,
      JSON.stringify({ date: todayKey(), count: next } satisfies StoredAiUsage),
    );
  }
  return next;
}

export type AiPromptQuotaState = {
  isLimited: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
  exhausted: boolean;
};

export function getAiPromptQuotaState(planId: PlanId | string, tenantId?: string): AiPromptQuotaState {
  const limit = getPlanQuotas(planId).aiCardPromptsPerDay;
  const used = tenantId ? readAiPromptUsage(tenantId) : 0;

  if (limit === null) {
    return { isLimited: false, limit: null, used, remaining: null, exhausted: false };
  }

  const remaining = Math.max(0, limit - used);
  return {
    isLimited: true,
    limit,
    used,
    remaining,
    exhausted: remaining <= 0,
  };
}
