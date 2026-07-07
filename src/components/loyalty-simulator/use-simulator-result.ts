import { useDeferredValue, useMemo } from "react";
import {
  computeLivePreviewResult,
  computeSimulatorResult,
  type SimulatorFormState,
} from "./simulator-state";

export function useSimulatorResult(state: SimulatorFormState) {
  const deferred = useDeferredValue(state);
  return useMemo(() => computeSimulatorResult(deferred), [deferred]);
}

/** Mise à jour en direct — différée pendant la saisie pour laisser l'algo sweet spot calculer. */
export function useLiveCardPreview(state: SimulatorFormState) {
  const deferred = useDeferredValue(state);
  return useMemo(() => computeLivePreviewResult(deferred), [deferred]);
}
