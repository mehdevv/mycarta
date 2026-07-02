import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, ChevronDown, Clock } from "lucide-react";
import { useCurrentTenant } from "@/lib/tenant-context";
import { useGetAnalyticsOverview } from "@/api/analytics";
import { useGetPlanUsage } from "@/api/tenant";
import { readAiPromptUsage } from "@/lib/plan-quotas";
import { getPlanQuotas } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const TRIAL_DAYS = 14;
const TRIAL_EXPANDED_KEY = "dash-trial-expanded";

function useTrialCountdown(endsAt: string | null) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!endsAt) return;

    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setLabel("Expiré");
        return;
      }
      const days = Math.floor(diff / 86_400_000);
      const hours = Math.floor((diff % 86_400_000) / 3_600_000);
      const minutes = Math.floor((diff % 3_600_000) / 60_000);
      if (days > 0) {
        setLabel(`${days}j ${hours}h`);
      } else {
        setLabel(`${hours}h ${minutes}m`);
      }
    };

    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  return label;
}

function UsageBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const barColor =
    pct >= 90 ? "bg-[#e02424]" : pct >= 70 ? "bg-amber-500" : "bg-[var(--dash-brand)]";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-[10px] leading-none">
        <span className="text-[var(--dash-text-secondary)]">{label}</span>
        <span className="font-medium tabular-nums">{value}/{max}</span>
      </div>
      <div className="dash-trial-bar-track">
        <div className={cn("dash-trial-bar-fill", barColor)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function RemainingBar({
  label,
  remaining,
  max,
  timer,
}: {
  label: string;
  remaining: number;
  max: number;
  timer?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (remaining / max) * 100)) : 0;
  const barColor =
    pct <= 10 ? "bg-[#e02424]" : pct <= 30 ? "bg-amber-500" : "bg-[#0e9f6e]";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-[10px] leading-none">
        <span className="text-[var(--dash-text-secondary)]">{label}</span>
        <span className="font-medium tabular-nums">{timer || `${remaining}j`}</span>
      </div>
      <div className="dash-trial-bar-track">
        <div className={cn("dash-trial-bar-fill", barColor)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

type TrialCardProps = {
  variant: "active" | "expired";
  icon: typeof Clock;
  title: string;
  meta: string;
  expanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
};

function TrialCard({ variant, icon: Icon, title, meta, expanded, onToggle, children }: TrialCardProps) {
  return (
    <div
      className={cn(
        "dash-trial-card",
        variant === "active" ? "dash-trial-card--active" : "dash-trial-card--expired",
        expanded && "dash-trial-card--expanded",
      )}
    >
      <button
        type="button"
        className="dash-trial-compact"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={expanded ? "Réduire le résumé d'essai" : "Développer le résumé d'essai"}
      >
        <Icon size={14} className="dash-trial-compact-icon shrink-0" />
        <span className="dash-trial-compact-label truncate">{title}</span>
        <span className="dash-trial-compact-meta tabular-nums">{meta}</span>
        <ChevronDown
          size={14}
          className={cn("dash-trial-chevron shrink-0 transition-transform", expanded && "rotate-180")}
        />
      </button>

      {expanded && children && (
        <div className="dash-trial-expanded">
          {children}
        </div>
      )}
    </div>
  );
}

export default function SidebarTrialStatus() {
  const { trialStatus, tenant } = useCurrentTenant();
  const { data: analytics } = useGetAnalyticsOverview();
  const { data: planUsage } = useGetPlanUsage();
  const countdown = useTrialCountdown(trialStatus?.trialEndsAt ?? null);
  const [expanded, setExpanded] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(TRIAL_EXPANDED_KEY) === "true";
  });

  useEffect(() => {
    localStorage.setItem(TRIAL_EXPANDED_KEY, String(expanded));
  }, [expanded]);

  if (!tenant || !trialStatus) return null;
  if (trialStatus.isActive && trialStatus.planId !== "trial") return null;

  const toggle = () => setExpanded((e) => !e);

  if (!trialStatus.isActive) {
    return (
      <TrialCard
        variant="expired"
        icon={AlertTriangle}
        title="Essai expiré"
        meta="Voir plans"
        expanded={expanded}
        onToggle={toggle}
      >
        <div className="dash-trial-bar-track">
          <div className="dash-trial-bar-fill bg-[#e02424] w-full" />
        </div>
        <Link href="/billing" className="dash-trial-hint" onClick={(e) => e.stopPropagation()}>
          Passer à un plan payant →
        </Link>
      </TrialCard>
    );
  }

  if (trialStatus.planId === "trial") {
    const clientCount = planUsage?.clients ?? analytics?.totalClients ?? 0;
    const clientLimit = trialStatus.clientLimit ?? 10;
    const scansTotalLimit = trialStatus.scansTotalLimit;
    const scanCount = scansTotalLimit != null
      ? (planUsage?.scansTotal ?? 0)
      : (planUsage?.scansToday ?? analytics?.scansToday ?? 0);
    const scanLimit = scansTotalLimit ?? trialStatus.scansPerDayLimit ?? 25;
    const scanLabel = scansTotalLimit != null ? "Scans (essai)" : "Scans aujourd'hui";
    const aiLimit = getPlanQuotas("trial").aiCardPromptsPerDay ?? 3;
    const aiUsed = readAiPromptUsage(tenant.id);
    const compactMeta = countdown || `${trialStatus.daysLeft}j`;

    return (
      <TrialCard
        variant="active"
        icon={Clock}
        title="Essai gratuit"
        meta={compactMeta}
        expanded={expanded}
        onToggle={toggle}
      >
        <p className="dash-trial-hint dash-trial-hint--inline">
          Essai limité à {clientLimit} clients et {scanLimit} scans.
        </p>
        <div className="dash-trial-bars space-y-2.5">
          <RemainingBar
            label="Temps restant"
            remaining={trialStatus.daysLeft}
            max={TRIAL_DAYS}
            timer={countdown}
          />
          <UsageBar label="Clients" value={clientCount} max={clientLimit} />
          <UsageBar label={scanLabel} value={scanCount} max={scanLimit} />
          <UsageBar label="Prompts IA aujourd'hui" value={aiUsed} max={aiLimit} />
        </div>
        <Link href="/billing" className="dash-trial-hint" onClick={(e) => e.stopPropagation()}>
          Voir les plans →
        </Link>
      </TrialCard>
    );
  }

  return null;
}
