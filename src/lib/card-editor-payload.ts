import type { BrandingLimits } from "@/lib/branding-limits";
import { DEFAULT_CARD_DESIGN_ID } from "@/lib/card-templates";
import type { StampMilestone } from "@/lib/stamp-milestones";

export type CardEditorFields = {
  businessName: string;
  logoUrl: string;
  cardTemplateUrl: string;
  cardDesignId: string;
  primaryColor: string;
  secondaryColor: string;
  stampsEnabled: boolean;
  spendEnabled: boolean;
  stampThreshold: number;
  spendThresholdDzd: number;
  maxScansPerDay: number;
  rewardValue: string;
  stampMilestones: StampMilestone[];
  trackProducts: boolean;
  collectClientEmail: boolean;
};

export function cardEditorToShopSettings(
  state: CardEditorFields,
  limits: BrandingLimits,
  fallbackBusinessName?: string,
) {
  const businessName = state.businessName.trim() || fallbackBusinessName || "Mon commerce";
  return {
    businessName,
    logoUrl: state.logoUrl.trim() || null,
    cardTemplateUrl: limits.canCustomCardBackground
      ? state.cardTemplateUrl.trim() || null
      : null,
    cardDesignId: limits.canBrowseCardTemplates
      ? state.cardDesignId || DEFAULT_CARD_DESIGN_ID
      : DEFAULT_CARD_DESIGN_ID,
    primaryColor: state.primaryColor,
    secondaryColor: state.secondaryColor,
    stampsEnabled: state.stampsEnabled,
    spendEnabled: state.spendEnabled,
    stampThreshold: state.stampThreshold,
    spendThresholdDzd: state.spendThresholdDzd,
    maxScansPerDay: state.maxScansPerDay,
    rewardValue: state.rewardValue.trim() || null,
    stampMilestones:
      state.stampsEnabled ? state.stampMilestones.filter((m) => m.label.trim()) : [],
    trackProducts: state.stampsEnabled ? state.trackProducts : false,
    collectClientEmail: state.collectClientEmail,
  };
}

export function tenantBrandingFromCardEditor(state: CardEditorFields, fallbackBusinessName?: string) {
  return {
    name: state.businessName.trim() || fallbackBusinessName || "Mon commerce",
    logo_url: state.logoUrl.trim() || null,
    brand_color: state.primaryColor,
  };
}
