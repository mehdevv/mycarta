import { Users, UserCog, Megaphone, MapPin, ScanLine, Palette, Headphones } from "lucide-react";
import { getPlan, type PlanId } from "@/lib/pricing";
import type { PlanUsage, TrialStatus } from "@/api/tenant";
import { cn } from "@/lib/utils";

type LimitRow = {
  key: string;
  label: string;
  used: number;
  limit: number | null;
  icon: typeof Users;
  hint?: string;
};

function formatLimit(value: number | null): string {
  if (value === null) return "Illimité";
  return value.toLocaleString("fr-DZ");
}

function usageRatio(used: number, limit: number | null): number {
  if (limit === null || limit <= 0) return 0;
  return Math.min(100, (used / limit) * 100);
}

function barTone(ratio: number, limit: number | null): "ok" | "warn" | "danger" | "unlimited" {
  if (limit === null) return "unlimited";
  if (ratio >= 100) return "danger";
  if (ratio >= 85) return "warn";
  return "ok";
}

export function PlanLimitsCard({
  planId,
  trialStatus,
  usage,
  loading,
}: {
  planId: PlanId;
  trialStatus: TrialStatus | null | undefined;
  usage: PlanUsage | null | undefined;
  loading?: boolean;
}) {
  const plan = getPlan(planId);

  const limits = {
    clientLimit: trialStatus?.clientLimit ?? plan.clientLimit,
    workerLimit: trialStatus?.workerLimit ?? plan.workerLimit,
    campaignLimit: trialStatus?.campaignLimit ?? plan.campaignLimit,
    locationLimit: trialStatus?.locationLimit ?? plan.locationLimit,
    scansPerDayLimit: trialStatus?.scansPerDayLimit ?? null,
  };

  const rows: LimitRow[] = [
    {
      key: "clients",
      label: "Clients fidélité",
      used: usage?.clients ?? 0,
      limit: limits.clientLimit,
      icon: Users,
    },
    {
      key: "workers",
      label: "Workers (scan QR)",
      used: usage?.workers ?? 0,
      limit: limits.workerLimit,
      icon: UserCog,
    },
    {
      key: "campaigns",
      label: "Campagnes",
      used: usage?.campaignsThisMonth ?? 0,
      limit: limits.campaignLimit,
      icon: Megaphone,
      hint: "Ce mois-ci",
    },
    {
      key: "locations",
      label: "Localisation(s)",
      used: usage?.locations ?? 1,
      limit: limits.locationLimit,
      icon: MapPin,
    },
  ];

  if (limits.scansPerDayLimit != null) {
    rows.push({
      key: "scans",
      label: "Scans aujourd'hui",
      used: usage?.scansToday ?? 0,
      limit: limits.scansPerDayLimit,
      icon: ScanLine,
    });
  }

  return (
    <article className="dash-card">
      <div className="dash-card-header">
        <div>
          <h2 className="dash-card-title">Limites du plan</h2>
          <p className="dash-card-subtitle">
            Utilisation actuelle — {plan.emoji} {plan.name}
          </p>
        </div>
      </div>

      <div className="dash-card-body pt-0 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="dash-skeleton h-14 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="dash-limit-grid">
              {rows.map((row) => {
                const Icon = row.icon;
                const ratio = usageRatio(row.used, row.limit);
                const tone = barTone(ratio, row.limit);
                const atLimit = row.limit !== null && row.used >= row.limit;

                return (
                  <div key={row.key} className="dash-limit-row">
                    <div className="dash-limit-row-head">
                      <span className="dash-limit-icon" aria-hidden>
                        <Icon size={16} strokeWidth={2} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="dash-limit-label">
                          {row.label}
                          {row.hint ? (
                            <span className="dash-limit-hint"> · {row.hint}</span>
                          ) : null}
                        </p>
                        <p className="dash-limit-value">
                          <span className={cn(atLimit && "text-red-600 font-semibold")}>
                            {row.used.toLocaleString("fr-DZ")}
                          </span>
                          <span className="dash-limit-sep"> / </span>
                          <span>{formatLimit(row.limit)}</span>
                        </p>
                      </div>
                      {atLimit && (
                        <span className="dash-badge dash-badge--danger shrink-0">Limite</span>
                      )}
                    </div>
                    {row.limit !== null && (
                      <div className="dash-limit-bar" aria-hidden>
                        <span
                          className={cn("dash-limit-bar-fill", `dash-limit-bar-fill--${tone}`)}
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="dash-limit-meta">
              <div className="dash-limit-meta-item">
                <Palette size={15} strokeWidth={2} />
                <span>
                  Carte : <strong>{plan.cardDesign}</strong>
                </span>
              </div>
              <div className="dash-limit-meta-item">
                <Headphones size={15} strokeWidth={2} />
                <span>
                  Support {plan.support} · {plan.supportResponse}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </article>
  );
}
