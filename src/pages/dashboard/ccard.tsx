import { useEffect, useState } from "react";
import { useGetSettings } from "@/api";
import { useGetTrialStatus } from "@/api/tenant";
import { useCurrentTenant } from "@/lib/tenant-context";
import { getBrandingLimits } from "@/lib/branding-limits";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import FidelityCardPreview from "@/components/fidelity/fidelity-card-preview";
import CardEditorSidebar, {
  defaultCardEditorState,
  type CardEditorState,
} from "@/components/fidelity/card-editor-sidebar";
import { clampMilestonesToThreshold } from "@/lib/stamp-milestones";
import { spendProgressPercent } from "@/lib/spend-rewards";
import { shouldShowCartaWatermark } from "@/lib/trial-watermark";

export default function CardEditorPage() {
  const { data: settings, isLoading } = useGetSettings();
  const { tenant } = useCurrentTenant();
  const { data: trialStatus } = useGetTrialStatus();

  const [state, setState] = useState<CardEditorState>(() => defaultCardEditorState());
  const [previewStamps, setPreviewStamps] = useState(3);
  const [previewSpendDzd, setPreviewSpendDzd] = useState(3500);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!settings || dirty) return;
    setState(defaultCardEditorState(settings));
    setPreviewStamps((prev) => Math.min(prev, settings.stampThreshold ?? 9));
    setPreviewSpendDzd((prev) =>
      Math.min(prev, Math.max(0, (settings.spendThresholdDzd ?? 10000) - 500)),
    );
  }, [settings, dirty]);

  const handleChange = (next: CardEditorState) => {
    setDirty(true);
    setState(next);
  };

  const handleSaved = () => {
    setDirty(false);
  };

  const planId = trialStatus?.planId ?? tenant?.planId ?? "trial";
  const limits = getBrandingLimits(planId);
  const showWatermark = shouldShowCartaWatermark(null, planId);
  const milestones = clampMilestonesToThreshold(state.stampMilestones, state.stampThreshold);

  if (isLoading) {
    return (
      <div className="py-16 text-center text-[var(--dash-text-secondary)]">Chargement…</div>
    );
  }

  return (
    <div className="dash-card-editor-page">
      <DashboardPageHeader
        eyebrow="Éditeur"
        title="Carte fidélité"
      />

      <div className="dash-card-editor-layout">
        <div
          className="dash-card-editor-preview-pane"
          style={
            {
              "--preview-primary": state.primaryColor,
              "--preview-secondary": state.secondaryColor,
            } as React.CSSProperties
          }
        >
          <div className="dash-card-editor-preview-label">
            <span className="dash-badge dash-badge--muted">Aperçu client</span>
          </div>
          <FidelityCardPreview
            businessName={state.businessName}
            logoUrl={state.logoUrl || null}
            cardTemplateUrl={state.cardTemplateUrl || null}
            cardDesignId={state.cardDesignId}
            primaryColor={state.primaryColor}
            secondaryColor={state.secondaryColor}
            stampsEnabled={state.stampsEnabled}
            spendEnabled={state.spendEnabled}
            stampThreshold={state.stampThreshold}
            currentStamps={previewStamps}
            spendThresholdDzd={state.spendThresholdDzd}
            currentCycleSpendDzd={previewSpendDzd}
            rewardValue={state.rewardValue}
            milestones={milestones}
            showCustomBg={limits.canCustomCardBackground}
            showWatermark={showWatermark}
          />
        </div>

        <CardEditorSidebar
          state={state}
          previewStamps={previewStamps}
          previewSpendDzd={previewSpendDzd}
          onChange={handleChange}
          onPreviewStampsChange={setPreviewStamps}
          onPreviewSpendDzdChange={setPreviewSpendDzd}
          onSaved={handleSaved}
        />
      </div>
    </div>
  );
}
