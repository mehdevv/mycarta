import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCompleteDashboardTutorial, getTenantQueryKey } from "@/api/tenant";
import { useCurrentTenant } from "@/lib/tenant-context";
import { useDashboardTour } from "@/lib/dashboard-tour-context";
import { cn } from "@/lib/utils";

export type TourStep = {
  id: string;
  target: string;
  title: string;
  body: string;
};

const TOUR_STEPS: TourStep[] = [
  {
    id: "overview",
    target: '[data-tour="nav-overview"]',
    title: "Vue d'ensemble",
    body: "Suivez vos clients, scans et récompenses en temps réel depuis cette page.",
  },
  {
    id: "clients",
    target: '[data-tour="nav-clients"]',
    title: "Clients",
    body: "Retrouvez et gérez toutes les cartes fidélité de vos clients.",
  },
  {
    id: "workers",
    target: '[data-tour="nav-workers"]',
    title: "Employés",
    body: "Ajoutez votre équipe et partagez le lien de connexion employés.",
  },
  {
    id: "settings",
    target: '[data-tour="nav-settings"]',
    title: "Paramètres",
    body: "Modifiez votre branding, vos liens clients et employés à tout moment.",
  },
  {
    id: "billing",
    target: '[data-tour="nav-billing"]',
    title: "Facturation",
    body: "Gérez votre essai gratuit et choisissez votre abonnement.",
  },
];

type Rect = { top: number; left: number; width: number; height: number };

const TOOLTIP_WIDTH = 300;
const VIEWPORT_MARGIN = 16;
const SPOTLIGHT_PAD = 8;
const TOOLTIP_GAP = 16;

function getTargetRect(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function rectsOverlap(a: Rect, b: Rect, gap = 0): boolean {
  return !(
    a.left + a.width + gap <= b.left ||
    b.left + b.width + gap <= a.left ||
    a.top + a.height + gap <= b.top ||
    b.top + b.height + gap <= a.top
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function getSidebarRight(): number {
  const sidebar = document.querySelector(".dash-sidebar");
  return sidebar?.getBoundingClientRect().right ?? 0;
}

function computeTooltipPosition(
  target: Rect | null,
  tooltipWidth: number,
  tooltipHeight: number,
): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(tooltipWidth, vw - VIEWPORT_MARGIN * 2);

  if (!target) {
    return {
      top: Math.max(VIEWPORT_MARGIN, (vh - tooltipHeight) / 2),
      left: Math.max(VIEWPORT_MARGIN, (vw - width) / 2),
    };
  }

  const spotlight: Rect = {
    top: target.top - SPOTLIGHT_PAD,
    left: target.left - SPOTLIGHT_PAD,
    width: target.width + SPOTLIGHT_PAD * 2,
    height: target.height + SPOTLIGHT_PAD * 2,
  };

  const sidebarRight = getSidebarRight();
  const baseLeft = Math.max(
    spotlight.left + spotlight.width + TOOLTIP_GAP,
    sidebarRight + TOOLTIP_GAP,
  );

  const candidates: { top: number; left: number }[] = [
    // Prefer main content area, vertically aligned with target
    { top: target.top + target.height / 2 - tooltipHeight / 2, left: baseLeft },
    // Below target, still to the right of sidebar
    { top: spotlight.top + spotlight.height + TOOLTIP_GAP, left: baseLeft },
    // Above target
    { top: spotlight.top - tooltipHeight - TOOLTIP_GAP, left: baseLeft },
    // Far right column if sidebar is wide
    { top: target.top + target.height / 2 - tooltipHeight / 2, left: vw - width - VIEWPORT_MARGIN },
    // Center screen fallback
    { top: (vh - tooltipHeight) / 2, left: (vw - width) / 2 },
  ];

  for (const candidate of candidates) {
    const top = clamp(candidate.top, VIEWPORT_MARGIN, vh - tooltipHeight - VIEWPORT_MARGIN);
    const left = clamp(candidate.left, VIEWPORT_MARGIN, vw - width - VIEWPORT_MARGIN);

    const tooltipRect: Rect = { top, left, width, height: tooltipHeight };
    const inViewport =
      top >= VIEWPORT_MARGIN &&
      left >= VIEWPORT_MARGIN &&
      top + tooltipHeight <= vh - VIEWPORT_MARGIN &&
      left + width <= vw - VIEWPORT_MARGIN;

    if (inViewport && !rectsOverlap(tooltipRect, spotlight, TOOLTIP_GAP)) {
      return { top, left };
    }
  }

  // Last resort: stack below or above target without horizontal overlap
  let top = spotlight.top + spotlight.height + TOOLTIP_GAP;
  if (top + tooltipHeight > vh - VIEWPORT_MARGIN) {
    top = spotlight.top - tooltipHeight - TOOLTIP_GAP;
  }
  top = clamp(top, VIEWPORT_MARGIN, vh - tooltipHeight - VIEWPORT_MARGIN);

  return {
    top,
    left: clamp(baseLeft, VIEWPORT_MARGIN, vw - width - VIEWPORT_MARGIN),
  };
}

export default function DashboardTour() {
  const { isOpen, closeTour } = useDashboardTour();
  const { onboardingComplete, dashboardTutorialComplete } = useCurrentTenant();
  const completeTutorial = useCompleteDashboardTutorial();
  const queryClient = useQueryClient();

  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTour = isOpen || (onboardingComplete && !dashboardTutorialComplete);
  const step = TOUR_STEPS[stepIndex];

  const updateRect = useCallback(() => {
    if (!showTour || !step) return;
    setRect(getTargetRect(step.target));
  }, [showTour, step]);

  useEffect(() => {
    if (!showTour || !step) return;

    const el = document.querySelector(step.target);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });

    const t1 = window.setTimeout(updateRect, 120);
    const t2 = window.setTimeout(updateRect, 400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [showTour, stepIndex, step, updateRect]);

  useEffect(() => {
    if (!showTour) return;
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [showTour, stepIndex, updateRect]);

  useLayoutEffect(() => {
    if (!showTour) return;
    const height = tooltipRef.current?.offsetHeight ?? 220;
    const width = tooltipRef.current?.offsetWidth ?? TOOLTIP_WIDTH;
    setTooltipPos(computeTooltipPosition(rect, width, height));
  }, [showTour, stepIndex, rect]);

  const finish = async () => {
    try {
      if (!dashboardTutorialComplete) {
        await completeTutorial.mutateAsync();
        await queryClient.invalidateQueries({ queryKey: getTenantQueryKey() });
      }
    } finally {
      closeTour();
      setStepIndex(0);
    }
  };

  if (!showTour || !step) return null;

  const spotlight = rect
    ? {
        top: rect.top - SPOTLIGHT_PAD,
        left: rect.left - SPOTLIGHT_PAD,
        width: rect.width + SPOTLIGHT_PAD * 2,
        height: rect.height + SPOTLIGHT_PAD * 2,
      }
    : null;

  return createPortal(
    <div className="dash-tour-root" role="dialog" aria-modal="true" aria-label="Tutoriel">
      <div className="dash-tour-backdrop" onClick={() => void finish()} aria-hidden />

      {spotlight && (
        <div
          className="dash-tour-spotlight"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
          }}
        />
      )}

      <div
        ref={tooltipRef}
        className="dash-tour-card"
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--dash-brand)]">
            {stepIndex + 1} / {TOUR_STEPS.length}
          </p>
          <button
            type="button"
            onClick={() => void finish()}
            className="rounded-lg p-1 text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-secondary)]"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="text-base font-semibold text-[var(--dash-text)]">{step.title}</h3>
        <p className="mt-2 text-sm text-[var(--dash-text-secondary)] leading-relaxed">{step.body}</p>

        <div className="mt-5 flex items-center justify-between gap-2">
          <button
            type="button"
            className="text-sm text-[var(--dash-text-secondary)] hover:text-[var(--dash-text)]"
            onClick={() => void finish()}
          >
            Passer
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={stepIndex === 0}
              className={cn(
                "dash-btn-secondary !w-auto !min-h-0 px-3 py-2",
                stepIndex === 0 && "opacity-40 cursor-not-allowed",
              )}
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {stepIndex < TOUR_STEPS.length - 1 ? (
              <button
                type="button"
                className="dash-btn-primary !w-auto !min-h-0 px-4 py-2"
                onClick={() => setStepIndex((i) => i + 1)}
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                className="dash-btn-primary !w-auto !min-h-0 px-4 py-2"
                onClick={() => void finish()}
              >
                Terminer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
