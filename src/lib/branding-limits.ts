import type { PlanId } from "@/lib/pricing";
import { getPlan, getPlanCapabilities } from "@/lib/pricing";

export type BrandingLimits = {
  planId: PlanId;
  planLabel: string;
  cardDesignLabel: string;
  canUseAiCardBuilder: boolean;
  canBrowseCardTemplates: boolean;
  canUseExclusiveTemplates: boolean;
  canCustomCardBackground: boolean;
  canUseWhatsapp: boolean;
  canUseApi: boolean;
  canUseExternalAssetUrls: boolean;
  maxBusinessNameLength: number;
  clientLimit: number | null;
  workerLimit: number | null;
  campaignLimit: number | null;
  locationLimit: number | null;
};

export function getBrandingLimits(planId: PlanId = "trial"): BrandingLimits {
  const plan = getPlan(planId);
  const caps = getPlanCapabilities(planId);

  return {
    planId: plan.id as PlanId,
    planLabel: plan.name,
    cardDesignLabel: plan.cardDesign,
    canUseAiCardBuilder: caps.aiCardBuilder,
    canBrowseCardTemplates: caps.cardTemplates,
    canUseExclusiveTemplates: caps.exclusiveTemplates,
    canCustomCardBackground: caps.customCardBg,
    canUseWhatsapp: caps.whatsapp,
    canUseApi: caps.apiAccess,
    canUseExternalAssetUrls: planId !== "trial",
    maxBusinessNameLength: 80,
    clientLimit: plan.clientLimit,
    workerLimit: plan.workerLimit,
    campaignLimit: plan.campaignLimit,
    locationLimit: plan.locationLimit,
  };
}
