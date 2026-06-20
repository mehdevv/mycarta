import { useCallback, useState } from "react";
import type { PlanId } from "@/lib/pricing";
import {
  getAiPromptQuotaState,
  incrementAiPromptUsage,
  readAiPromptUsage,
  type AiPromptQuotaState,
} from "@/lib/plan-quotas";

export function useAiPromptQuota(planId: PlanId | string, tenantId: string | undefined) {
  const [used, setUsed] = useState(() => (tenantId ? readAiPromptUsage(tenantId) : 0));

  const refresh = useCallback(() => {
    if (tenantId) setUsed(readAiPromptUsage(tenantId));
  }, [tenantId]);

  const consume = useCallback(() => {
    if (!tenantId) return false;
    const state = getAiPromptQuotaState(planId, tenantId);
    if (state.exhausted) return false;
    incrementAiPromptUsage(tenantId);
    setUsed(readAiPromptUsage(tenantId));
    return true;
  }, [planId, tenantId]);

  const quota: AiPromptQuotaState = (() => {
    const base = getAiPromptQuotaState(planId, tenantId);
    if (!base.isLimited) return base;
    const remaining = Math.max(0, (base.limit ?? 0) - used);
    return {
      ...base,
      used,
      remaining,
      exhausted: remaining <= 0,
    };
  })();

  return { quota, consume, refresh };
}
