import {
  type BusinessVertical,
  VERTICAL_PRESETS,
} from "@/lib/loyalty-optimizer";
import {
  findSweetSpotPlan,
  type EssentialBusinessInput,
  type SweetSpotOptimizerResult,
} from "@/lib/loyalty-sweet-spot";

export interface SimulatorFormState {
  vertical: BusinessVertical | null;
  avgTicketDzd: number | null;
  marginPercent: number | null;
}

export const EMPTY_SIMULATOR_STATE: SimulatorFormState = {
  vertical: null,
  avgTicketDzd: null,
  marginPercent: null,
};

export function isVerticalChosen(state: SimulatorFormState): state is SimulatorFormState & {
  vertical: BusinessVertical;
} {
  return state.vertical != null;
}

/** Panier + commerce suffisent — Pulse calibre le reste. */
export function isNumbersComplete(state: SimulatorFormState): boolean {
  return (
    isVerticalChosen(state) &&
    state.avgTicketDzd != null &&
    state.avgTicketDzd >= 50
  );
}

export function isSimulatorReady(state: SimulatorFormState): boolean {
  return isNumbersComplete(state);
}

export function isCardPreviewReady(state: SimulatorFormState): boolean {
  return isNumbersComplete(state);
}

function toEssentials(state: SimulatorFormState): EssentialBusinessInput | null {
  if (!isNumbersComplete(state) || !state.vertical) return null;
  const preset = VERTICAL_PRESETS[state.vertical];
  return {
    vertical: state.vertical,
    avgTicketDzd: state.avgTicketDzd!,
    marginPercent: state.marginPercent ?? preset.marginPercent,
  };
}

export function computeLivePreviewResult(state: SimulatorFormState): SweetSpotOptimizerResult | null {
  const essentials = toEssentials(state);
  if (!essentials) return null;
  return findSweetSpotPlan(essentials);
}

export function computeSimulatorResult(state: SimulatorFormState): SweetSpotOptimizerResult | null {
  return computeLivePreviewResult(state);
}

export function getEffectiveMargin(state: SimulatorFormState): number | null {
  if (!state.vertical) return state.marginPercent;
  const preset = VERTICAL_PRESETS[state.vertical];
  return state.marginPercent ?? preset.marginPercent;
}
