import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  Settings,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCompleteDashboardTutorial, getTenantQueryKey } from "@/api/tenant";
import { useCurrentTenant } from "@/lib/tenant-context";
import { useDashboardTour } from "@/lib/dashboard-tour-context";
import { cn } from "@/lib/utils";

export type TourStep = {
  id: string;
  target: string;
  title: string;
  body: string;
  icon: LucideIcon;
};

const TOUR_STEPS: TourStep[] = [
  {
    id: "overview",
    target: '[data-tour="nav-overview"]',
    title: "Vue d'ensemble",
    body: "Suivez vos clients, scans et récompenses en temps réel depuis cette page.",
    icon: LayoutDashboard,
  },
  {
    id: "clients",
    target: '[data-tour="nav-clients"]',
    title: "Clients",
    body: "Retrouvez et gérez toutes les cartes fidélité de vos clients.",
    icon: Users,
  },
  {
    id: "workers",
    target: '[data-tour="nav-workers"]',
    title: "Employés",
    body: "Ajoutez votre équipe et partagez le lien de connexion employés.",
    icon: Users,
  },
  {
    id: "settings",
    target: '[data-tour="nav-settings"]',
    title: "Paramètres",
    body: "Modifiez votre branding, vos liens clients et employés à tout moment.",
    icon: Settings,
  },
  {
    id: "billing",
    target: '[data-tour="nav-billing"]',
    title: "Facturation",
    body: "Gérez votre essai gratuit et choisissez votre abonnement.",
    icon: CreditCard,
  },
];

type Rect = { top: number; left: number; width: number; height: number };

const TOOLTIP_WIDTH = 300;
const VIEWPORT_MARGIN = 16;
const SPOTLIGHT_PAD = 8;
const TOOLTIP_GAP = 16;
const MOBILE_BREAKPOINT = 1024;

function isMobileLayout() {
  return typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT;
}

function getTargetRect(selector: string): Rect | null {
  const elements = document.querySelectorAll(selector);
  for (const el of elements) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      return { top: r.top, left: r.left, width: r.width, height: r.height };
    }
  }
  return null;
}

function rectsEqual(a: Rect | null, b: Rect | null) {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.top - b.top) < 1 &&
    Math.abs(a.left - b.left) < 1 &&
    Math.abs(a.width - b.width) < 1 &&
    Math.abs(a.height - b.height) < 1
  );
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
  const r = sidebar?.getBoundingClientRect();
  if (!r || r.width === 0) return 0;
  return r.right;
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
    { top: target.top + target.height / 2 - tooltipHeight / 2, left: baseLeft },
    { top: spotlight.top + spotlight.height + TOOLTIP_GAP, left: baseLeft },
    { top: spotlight.top - tooltipHeight - TOOLTIP_GAP, left: baseLeft },
    { top: target.top + target.height / 2 - tooltipHeight / 2, left: vw - width - VIEWPORT_MARGIN },
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

function TourCard({
  step,
  stepIndex,
  isMobile,
  tooltipPos,
  tooltipRef,
  onFinish,
  onPrev,
  onNext,
}: {
  step: TourStep;
  stepIndex: number;
  isMobile: boolean;
  tooltipPos: { top: number; left: number };
  tooltipRef: React.RefObject<HTMLDivElement | null>;
  onFinish: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const StepIcon = step.icon;

  return (
    <div
      ref={tooltipRef}
      className={cn("dash-tour-card", isMobile && "dash-tour-card--mobile")}
      style={isMobile ? undefined : { top: tooltipPos.top, left: tooltipPos.left }}
      role="document"
    >
      {isMobile && (
        <div className="dash-tour-mobile-target">
          <div className="dash-tour-mobile-target-icon">
            <StepIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--dash-brand)]">
              Menu · {stepIndex + 1} / {TOUR_STEPS.length}
            </p>
            <p className="font-semibold text-[var(--dash-text)]">{step.title}</p>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-2 mb-3">
        {!isMobile && (
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--dash-brand)]">
            {stepIndex + 1} / {TOUR_STEPS.length}
          </p>
        )}
        {isMobile && <span className="flex-1" />}
        <button
          type="button"
          onClick={onFinish}
          className="rounded-lg p-1 text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-secondary)]"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!isMobile && <h3 className="text-base font-semibold text-[var(--dash-text)]">{step.title}</h3>}
      <p className={cn("text-sm text-[var(--dash-text-secondary)] leading-relaxed", !isMobile && "mt-2")}>
        {step.body}
      </p>

      <div className="mt-5 flex items-center justify-between gap-2">
        <button
          type="button"
          className="text-sm text-[var(--dash-text-secondary)] hover:text-[var(--dash-text)] min-h-11 px-2"
          onClick={onFinish}
        >
          Passer
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={stepIndex === 0}
            className={cn(
              "dash-btn-secondary !w-auto !min-h-11 px-3 py-2",
              stepIndex === 0 && "opacity-40 cursor-not-allowed",
            )}
            onClick={onPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {stepIndex < TOUR_STEPS.length - 1 ? (
            <button type="button" className="dash-btn-primary !w-auto !min-h-11 px-4 py-2" onClick={onNext}>
              Suivant
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" className="dash-btn-primary !w-auto !min-h-11 px-4 py-2" onClick={onFinish}>
              Terminer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardTour() {
  const { isOpen, closeTour } = useDashboardTour();
  const { onboardingComplete, dashboardTutorialComplete } = useCurrentTenant();
  const completeTutorial = useCompleteDashboardTutorial();
  const queryClient = useQueryClient();

  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [isMobile, setIsMobile] = useState(() => isMobileLayout());
  const tooltipRef = useRef<HTMLDivElement>(null);
  const measureTokenRef = useRef(0);

  const showTour = isOpen || (onboardingComplete && !dashboardTutorialComplete);
  const step = TOUR_STEPS[stepIndex];

  const measureTarget = useCallback(() => {
    if (!step || isMobileLayout()) return;
    const next = getTargetRect(step.target);
    setRect((prev) => (rectsEqual(prev, next) ? prev : next));
  }, [step]);

  useEffect(() => {
    if (!showTour) {
      setRect(null);
      setStepIndex(0);
      return;
    }

    const onResize = () => {
      const mobile = isMobileLayout();
      setIsMobile(mobile);
      if (!mobile) measureTarget();
      else setRect(null);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [showTour, measureTarget]);

  useEffect(() => {
    if (!showTour || !step || isMobileLayout()) return;

    const token = ++measureTokenRef.current;
    const delay = 80;
    const timer = window.setTimeout(() => {
      if (measureTokenRef.current !== token) return;

      const el = document.querySelector(step.target);
      el?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });

      window.requestAnimationFrame(() => {
        if (measureTokenRef.current !== token) return;
        measureTarget();
      });
    }, delay);

    return () => window.clearTimeout(timer);
  }, [showTour, stepIndex, step, measureTarget]);

  useLayoutEffect(() => {
    if (!showTour || isMobile) return;
    const height = tooltipRef.current?.offsetHeight ?? 220;
    const width = tooltipRef.current?.offsetWidth ?? TOOLTIP_WIDTH;
    const next = computeTooltipPosition(rect, width, height);
    setTooltipPos((prev) =>
      Math.abs(prev.top - next.top) < 1 && Math.abs(prev.left - next.left) < 1 ? prev : next,
    );
  }, [showTour, stepIndex, rect, isMobile]);

  const finish = async () => {
    measureTokenRef.current += 1;
    try {
      if (!dashboardTutorialComplete) {
        await completeTutorial.mutateAsync();
        await queryClient.invalidateQueries({ queryKey: getTenantQueryKey() });
      }
    } finally {
      closeTour();
      setStepIndex(0);
      setRect(null);
    }
  };

  const goNext = () => setStepIndex((i) => Math.min(TOUR_STEPS.length - 1, i + 1));
  const goPrev = () => setStepIndex((i) => Math.max(0, i - 1));

  if (!showTour || !step) return null;

  const spotlight =
    !isMobile && rect
      ? {
          top: rect.top - SPOTLIGHT_PAD,
          left: rect.left - SPOTLIGHT_PAD,
          width: rect.width + SPOTLIGHT_PAD * 2,
          height: rect.height + SPOTLIGHT_PAD * 2,
        }
      : null;

  const card = (
    <TourCard
      step={step}
      stepIndex={stepIndex}
      isMobile={isMobile}
      tooltipPos={tooltipPos}
      tooltipRef={tooltipRef}
      onFinish={() => void finish()}
      onPrev={goPrev}
      onNext={goNext}
    />
  );

  if (isMobile) {
    return (
      <>
        {createPortal(<div className="dash-tour-root dash-tour-root--mobile" aria-hidden />, document.body)}
        {createPortal(
          <div className="dash-tour-root dash-tour-root--mobile-card" role="dialog" aria-modal="true" aria-label="Tutoriel">
            {card}
          </div>,
          document.body,
        )}
      </>
    );
  }

  return createPortal(
    <div className="dash-tour-root" role="dialog" aria-modal="true" aria-label="Tutoriel">
      <div className="dash-tour-backdrop" aria-hidden />
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
      {card}
    </div>,
    document.body,
  );
}
