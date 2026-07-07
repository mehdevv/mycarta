import { cn } from "@/lib/utils";
import {
  isNumbersComplete,
  isVerticalChosen,
  type SimulatorFormState,
} from "./simulator-state";

interface WorkflowProgressProps {
  state: SimulatorFormState;
  ready: boolean;
}

const STEPS = [
  { id: 1, label: "Commerce" },
  { id: 2, label: "Chiffres" },
  { id: 3, label: "Plan Pulse" },
] as const;

export function WorkflowProgress({ state, ready }: WorkflowProgressProps) {
  const step1Done = isVerticalChosen(state);
  const step2Done = isNumbersComplete(state);
  const step3Done = ready;

  const activeStep = !step1Done ? 1 : !step2Done ? 2 : !step3Done ? 3 : 3;

  const doneFor = (id: number) => {
    if (id === 1) return step1Done;
    if (id === 2) return step2Done;
    return step3Done;
  };

  return (
    <nav className="pulse-progress" aria-label="Étapes de la simulation">
      {STEPS.map((step, i) => {
        const done = doneFor(step.id);
        const active = activeStep === step.id && !done;
        return (
          <div key={step.id} className="pulse-progress-item">
            {i > 0 && (
              <span
                className={cn("pulse-progress-line", (done || activeStep > step.id) && "is-filled")}
                aria-hidden
              />
            )}
            <span
              className={cn(
                "pulse-progress-dot",
                done && "is-done",
                active && "is-active",
              )}
            >
              {done ? "✓" : step.id}
            </span>
            <span
              className={cn(
                "pulse-progress-label",
                (done || active) && "is-emphasis",
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </nav>
  );
}
