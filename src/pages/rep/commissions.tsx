import { useMemo } from "react";
import { useSalesCommissions } from "@/api/sales";
import {
  PlatformPageHeader,
  PlatformCard,
  PlatformCardBody,
  PlatformBanner,
  PlatformKpi,
  PlatformKpiSkeleton,
  PlatformSkeleton,
} from "@/components/platform/platform-ui";
import { formatDzd, PLANS } from "@/lib/pricing";
import { Coins } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvé",
  paid: "Payé",
};

export default function RepCommissionsPage() {
  const { data: commissions = [], isLoading, error } = useSalesCommissions();

  const totals = useMemo(() => {
    return commissions.reduce(
      (acc, c) => {
        acc[c.status] = (acc[c.status] ?? 0) + c.commission_dzd;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [commissions]);

  return (
    <div className="plat-stack">
      <PlatformPageHeader
        title="Commissions"
        description="Suivi des commissions sur les paiements de vos commerces."
      />

      {error && (
        <PlatformBanner>
          Impossible de charger les commissions. Vérifiez que la migration <code>024_sales_crm.sql</code> est appliquée.
        </PlatformBanner>
      )}

      {isLoading ? (
        <div className="plat-stat-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <PlatformKpiSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="plat-stat-grid">
          <PlatformKpi title="En attente" value={formatDzd(totals.pending ?? 0)} icon={Coins} accent="amber" />
          <PlatformKpi title="Approuvées" value={formatDzd(totals.approved ?? 0)} icon={Coins} accent="secondary" />
          <PlatformKpi title="Payées" value={formatDzd(totals.paid ?? 0)} icon={Coins} accent="secondary" />
        </div>
      )}

      <PlatformCard>
        <PlatformCardBody flush>
          {isLoading ? (
            <PlatformSkeleton className="h-48 m-4" />
          ) : commissions.length === 0 ? (
            <p className="plat-empty p-6">Aucune commission pour le moment.</p>
          ) : (
            <div className="plat-list">
              {commissions.map((c) => {
                const planName = PLANS.find((p) => p.id === c.plan_id)?.name ?? c.plan_id;
                return (
                  <div key={c.id} className="plat-list-item">
                    <div>
                      <p className="plat-cell-primary">{c.business_name}</p>
                      <p className="plat-cell-muted text-sm">
                        {planName} · {formatDzd(c.amount_dzd)} · {c.commission_rate}% → {formatDzd(c.commission_dzd)}
                      </p>
                      <p className="plat-cell-muted text-xs">
                        {new Date(c.created_at).toLocaleDateString("fr-DZ")}
                      </p>
                    </div>
                    <span className="plat-badge">{STATUS_LABELS[c.status] ?? c.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </PlatformCardBody>
      </PlatformCard>
    </div>
  );
}
