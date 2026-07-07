import {
  type BusinessVertical,
  VERTICAL_PRESETS,
} from "@/lib/loyalty-optimizer";
import {
  type SimulatorFormState,
  EMPTY_SIMULATOR_STATE,
  isNumbersComplete,
  isVerticalChosen,
  getEffectiveMargin,
} from "./simulator-state";
import { AutoTunePanel } from "./auto-tune-panel";
import type { SweetSpotOptimizerResult } from "@/lib/loyalty-sweet-spot";

export type { SimulatorFormState };
export { EMPTY_SIMULATOR_STATE, isSimulatorReady, computeSimulatorResult } from "./simulator-state";
export { useSimulatorResult, useLiveCardPreview } from "./use-simulator-result";

interface SimulatorFormProps {
  state: SimulatorFormState;
  onChange: (patch: Partial<SimulatorFormState>) => void;
  liveResult?: SweetSpotOptimizerResult | null;
}

const VERTICALS = Object.entries(VERTICAL_PRESETS) as [
  BusinessVertical,
  (typeof VERTICAL_PRESETS)[BusinessVertical],
][];

function parseOptionalInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function StepBadge({ n, done, active }: { n: number; done: boolean; active: boolean }) {
  return (
    <span
      className={`pulse-wizard-step-badge ${done ? "is-done" : ""} ${active ? "is-active" : ""}`}
    >
      {done ? "✓" : n}
    </span>
  );
}

export function SimulatorForm({ state, onChange, liveResult }: SimulatorFormProps) {
  const verticalChosen = isVerticalChosen(state);
  const numbersComplete = isNumbersComplete(state);
  const preset = state.vertical ? VERTICAL_PRESETS[state.vertical] : null;
  const effectiveMargin = getEffectiveMargin(state);

  const applyVertical = (vertical: BusinessVertical) => {
    onChange({ vertical });
  };

  return (
    <div className="pulse-form pulse-form-wizard">
      <header className="pulse-panel-head pulse-panel-head-compact">
        <h2 className="pulse-panel-title">Vos chiffres</h2>
        <p className="pulse-panel-desc">
          Entrez votre panier et votre marge — Pulse trouve le meilleur programme (tampons,
          budget, motivation client) pour maximiser votre profit.
        </p>
      </header>

      <section className="pulse-wizard-step is-open">
        <div className="pulse-wizard-step-head">
          <StepBadge n={1} done={verticalChosen} active={!verticalChosen} />
          <div>
            <h3 className="pulse-wizard-step-title">Votre commerce</h3>
            <p className="pulse-wizard-step-hint">Une seule sélection</p>
          </div>
        </div>
        <div className="pulse-chip-grid">
          {VERTICALS.map(([key, v]) => (
            <button
              key={key}
              type="button"
              className={`pulse-chip ${state.vertical === key ? "pulse-chip-active" : ""}`}
              onClick={() => applyVertical(key)}
            >
              {v.label}
            </button>
          ))}
        </div>
        {!verticalChosen && (
          <p className="pulse-wizard-placeholder">Sélectionnez un type pour continuer</p>
        )}
      </section>

      {verticalChosen && preset && (
        <section className="pulse-wizard-step is-open">
          <div className="pulse-wizard-step-head">
            <StepBadge n={2} done={numbersComplete} active={!numbersComplete} />
            <div>
              <h3 className="pulse-wizard-step-title">Panier &amp; marge</h3>
              <p className="pulse-wizard-step-hint">
                Indicatif {preset.label} : ~{preset.avgTicketDzd} DZD · {preset.marginPercent}%
                marge
              </p>
            </div>
          </div>

          <div className="pulse-form-grid pulse-form-grid-essential">
            <div className="pulse-field">
              <label className="pulse-label" htmlFor="pulse-ticket">
                Panier moyen
              </label>
              <div className="pulse-input-suffix">
                <input
                  id="pulse-ticket"
                  type="number"
                  min={50}
                  step={50}
                  className="pulse-input"
                  value={state.avgTicketDzd ?? ""}
                  placeholder={String(preset.avgTicketDzd)}
                  onChange={(e) => onChange({ avgTicketDzd: parseOptionalInt(e.target.value) })}
                />
                <span className="pulse-input-unit" aria-hidden>
                  DZD
                </span>
              </div>
            </div>

            <div className="pulse-field">
              <label className="pulse-label" htmlFor="pulse-margin">
                Marge brute
                {effectiveMargin != null && (
                  <span className="pulse-label-value"> — {effectiveMargin}%</span>
                )}
              </label>
              <div className="pulse-input-suffix">
                <input
                  id="pulse-margin"
                  type="number"
                  min={15}
                  max={85}
                  step={1}
                  className="pulse-input"
                  value={state.marginPercent ?? ""}
                  placeholder={String(preset.marginPercent)}
                  onChange={(e) => onChange({ marginPercent: parseOptionalInt(e.target.value) })}
                />
                <span className="pulse-input-unit" aria-hidden>
                  %
                </span>
              </div>
              {state.marginPercent == null && (
                <p className="pulse-hint pulse-hint-action">
                  Par défaut {preset.marginPercent}% pour {preset.label.toLowerCase()}
                </p>
              )}
            </div>
          </div>

          {liveResult?.autoTune && numbersComplete && (
            <AutoTunePanel
              autoTune={liveResult.autoTune}
              motivationScore={liveResult.best.motivationScore}
            />
          )}
        </section>
      )}
    </div>
  );
}
