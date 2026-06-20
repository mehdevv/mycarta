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

export default function CardEditorPage() {
  const { data: settings, isLoading } = useGetSettings();
  const { tenant } = useCurrentTenant();
  const { data: trialStatus } = useGetTrialStatus();

  const [state, setState] = useState<CardEditorState>(() => defaultCardEditorState());
  const [previewStamps, setPreviewStamps] = useState(3);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!settings || dirty) return;
    setState(defaultCardEditorState(settings));
    setPreviewStamps((prev) => Math.min(prev, settings.stampThreshold ?? 9));
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
            stampThreshold={state.stampThreshold}
            currentStamps={previewStamps}
            milestones={milestones}
            showCustomBg={limits.canCustomCardBackground}
          />
        </div>

        <CardEditorSidebar
          state={state}
          previewStamps={previewStamps}
          dirty={dirty}
          onChange={handleChange}
          onPreviewStampsChange={setPreviewStamps}
          onSaved={handleSaved}
        />
      </div>
    </div>
  );
}
