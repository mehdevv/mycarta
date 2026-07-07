import FidelityCardPreview from "@/components/fidelity/fidelity-card-preview";
import { DEFAULT_CARD_DESIGN_ID } from "@/lib/card-templates";
import { PLATFORM } from "@/lib/platform";
import type { StrategyRecommendation } from "@/lib/loyalty-optimizer";
import { VERTICAL_PRESETS } from "@/lib/loyalty-optimizer";
import type { SimulatorFormState } from "@/components/loyalty-simulator/simulator-form";
import {
  isCardPreviewReady,
  isVerticalChosen,
} from "@/components/loyalty-simulator/simulator-state";
import { withGrandPrizeOnFinalStamp } from "@/lib/stamp-milestones";
import { Sparkles } from "lucide-react";

interface SimulatorCardPreviewProps {
  state: SimulatorFormState;
  strategy: StrategyRecommendation | null;
}

export function SimulatorCardPreview({ state, strategy }: SimulatorCardPreviewProps) {
  const previewReady = isCardPreviewReady(state);

  if (!previewReady || !strategy || !isVerticalChosen(state)) {
    return (
      <div className="pulse-card-stage pulse-card-stage-empty">
        <p className="pulse-card-eyebrow">Aperçu carte client</p>
        <div className="pulse-card-empty">
          <Sparkles className="h-8 w-8 text-[var(--landing-brand)]" aria-hidden />
          <p className="pulse-card-empty-title">Carte en attente</p>
          <p className="pulse-card-empty-desc">
            Choisissez votre commerce et saisissez le panier moyen — la carte et le profit live se
            mettent à jour en direct.
          </p>
        </div>
      </div>
    );
  }

  const businessName = VERTICAL_PRESETS[state.vertical].label.split(" / ")[0];
  const stampThreshold = strategy.stampThreshold ?? 9;
  const spendThresholdDzd = strategy.spendThresholdDzd ?? 10000;
  const currentStamps = Math.min(
    stampThreshold - 1,
    Math.max(2, Math.floor(stampThreshold * 0.55)),
  );
  const currentSpend = strategy.spendEnabled ? Math.floor(spendThresholdDzd * 0.45) : 0;

  const cardMilestones = strategy.stampsEnabled
    ? withGrandPrizeOnFinalStamp(
        strategy.milestones ?? [],
        stampThreshold,
        strategy.rewardDescription,
      )
    : [];

  return (
    <div className="pulse-card-stage">
      <p className="pulse-card-eyebrow">Aperçu — ce que voit votre client</p>
      <FidelityCardPreview
        businessName={businessName}
        clientName="Client fidèle"
        logoUrl={null}
        cardTemplateUrl={null}
        cardDesignId={DEFAULT_CARD_DESIGN_ID}
        primaryColor={PLATFORM.primaryColor}
        secondaryColor={PLATFORM.secondaryColor}
        stampsEnabled={strategy.stampsEnabled}
        spendEnabled={strategy.spendEnabled}
        stampThreshold={stampThreshold}
        currentStamps={strategy.stampsEnabled ? currentStamps : 0}
        spendThresholdDzd={spendThresholdDzd}
        currentCycleSpendDzd={currentSpend}
        rewardValue={strategy.rewardDescription}
        milestones={cardMilestones}
        showCustomBg={false}
        showWatermark={false}
      />
      <p className="pulse-card-footnote">{strategy.customerPitch}</p>
    </div>
  );
}
