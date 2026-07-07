import { useState } from "react";
import MarketingPageShell from "@/components/landing/marketing-page-shell";
import PageMeta from "@/components/seo/page-meta";
import { absoluteUrl } from "@/lib/seo";
import {
  EMPTY_SIMULATOR_STATE,
  SimulatorForm,
  useSimulatorResult,
  useLiveCardPreview,
} from "@/components/loyalty-simulator/simulator-form";
import { ProfitDetector } from "@/components/loyalty-simulator/profit-detector";
import {
  isCardPreviewReady,
  isSimulatorReady,
} from "@/components/loyalty-simulator/simulator-state";
import { SimulatorResults } from "@/components/loyalty-simulator/simulator-results";
import { SimulatorCardPreview } from "@/components/loyalty-simulator/simulator-card-preview";
import { WorkflowProgress } from "@/components/loyalty-simulator/workflow-progress";

const PAGE_TITLE = "Pulse Fidélité — Simulateur de programme de fidélité";
const PAGE_DESC =
  "Simulateur intelligent pour commerçants : trouvez le programme tampons, cashback ou cadeau idéal — motivant pour vos clients, rentable pour vous.";

export default function PulseFidelitePage() {
  const [formState, setFormState] = useState(EMPTY_SIMULATOR_STATE);
  const ready = isSimulatorReady(formState);
  const result = useSimulatorResult(formState);
  const livePreview = useLiveCardPreview(formState);
  const showLiveProfit = isCardPreviewReady(formState) && livePreview?.best != null;

  return (
    <MarketingPageShell>
      <PageMeta title={PAGE_TITLE} description={PAGE_DESC} url={absoluteUrl("/pulse-fidelite")} />

      <section className="pulse-hero landing-section">
        <div className="container-page pulse-hero-inner pulse-hero-inner-compact">
          <div className="pulse-hero-copy">
            <p className="pulse-hero-eyebrow">Simulateur gratuit</p>
            <h1 className="landing-h1 pulse-title">Pulse Fidélité</h1>
            <p className="pulse-hero-lead">
              Entrez votre panier et votre marge — Pulse calibre le programme idéal pour motiver
              vos clients et maximiser votre profit.
            </p>
          </div>
        </div>
      </section>

      <section className="pulse-workspace landing-section landing-section--tight">
        <div className="container-page pulse-workflow">
          <WorkflowProgress state={formState} ready={ready} />

          <div className="pulse-layout-pro">
            <aside className="pulse-card-column">
              <SimulatorCardPreview
                state={formState}
                strategy={livePreview?.best ?? null}
              />
            </aside>

            <div className="pulse-flow-column">
              {showLiveProfit && (
                <div className="pulse-profit-live-sticky">
                  <ProfitDetector
                    strategy={livePreview.best}
                    isEstimate={formState.marginPercent == null}
                    compact
                  />
                </div>
              )}

              <SimulatorForm
                state={formState}
                onChange={(patch) => setFormState((prev) => ({ ...prev, ...patch }))}
                liveResult={livePreview}
              />

              {ready && result && (
                <SimulatorResults result={result} ready={ready} inline />
              )}
            </div>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
