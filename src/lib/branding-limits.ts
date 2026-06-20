import type { PlanId } from "@/lib/pricing";
import { getPlan, getPlanCapabilities, getPlanQuotas } from "@/lib/pricing";

export type BrandingLimits = {
  planId: PlanId;
  planLabel: string;
  cardDesignLabel: string;
  isTrialPlan: boolean;
  canUseAiCardBuilder: boolean;
  canBrowseCardTemplates: boolean;
  canUseExclusiveTemplates: boolean;
  canCustomCardBackground: boolean;
  canUseWhatsapp: boolean;
  canUseApi: boolean;
  canUseExternalAssetUrls: boolean;
  aiCardPromptsPerDay: number | null;
  maxBusinessNameLength: number;  clientLimit: number | null;
  workerLimit: number | null;
  campaignLimit: number | null;
  locationLimit: number | null;
};

export function getBrandingLimits(planId: PlanId = "trial"): BrandingLimits {
  const plan = getPlan(planId);
  const caps = getPlanCapabilities(planId);
  const quotas = getPlanQuotas(planId);

  return {
    planId: plan.id as PlanId,
    planLabel: plan.name,
    cardDesignLabel: plan.cardDesign,
    isTrialPlan: planId === "trial",
    canUseAiCardBuilder: caps.aiCardBuilder,
    canBrowseCardTemplates: caps.cardTemplates,
    canUseExclusiveTemplates: caps.exclusiveTemplates,
    canCustomCardBackground: caps.customCardBg,
    canUseWhatsapp: caps.whatsapp,
    canUseApi: caps.apiAccess,
    canUseExternalAssetUrls: true,
    aiCardPromptsPerDay: quotas.aiCardPromptsPerDay,
    maxBusinessNameLength: 80,    clientLimit: plan.clientLimit,
    workerLimit: plan.workerLimit,
    campaignLimit: plan.campaignLimit,
    locationLimit: plan.locationLimit,
  };
}
