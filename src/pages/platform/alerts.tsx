import { Link } from "wouter";
import { AlertTriangle, Clock, Receipt, Building2 } from "lucide-react";
import { usePlatformAlerts } from "@/api/platform";
import {
  PlatformPageHeader,
  PlatformCard,
  PlatformCardHeader,
  PlatformCardBody,
  PlatformKpi,
  PlatformKpiSkeleton,
  PlatformButton,
  PlatformBanner,
} from "@/components/platform/platform-ui";

export default function PlatformAlertsPage() {
  const { data: alerts, isLoading, error } = usePlatformAlerts();

  if (error) {
    return (
      <PlatformBanner>
        Migration <code>005_platform_admin_complete.sql</code> requise.
      </PlatformBanner>
    );
  }

  return (
    <div className="plat-stack">
      <PlatformPageHeader
        title="Alertes"
        description="Essais expirants, reçus en retard et commerces inactifs."
      />

      {isLoading ? (
        <div className="plat-stat-grid">
          {Array(4).fill(0).map((_, i) => (
            <PlatformKpiSkeleton key={i} />
          ))}
        </div>
      ) : alerts ? (
        <>
          <div className="plat-stat-grid">
            <PlatformKpi title="Essais J-3" value={alerts.trialExpiring3d} icon={Clock} accent="amber" />
            <PlatformKpi title="Essais J-7" value={alerts.trialExpiring7d} icon={Clock} accent="amber" />
            <PlatformKpi title="Reçus &gt; 48h" value={alerts.pendingReceiptsOver48h} icon={Receipt} accent="destructive" />
            <PlatformKpi title="Inactifs 14j+" value={alerts.inactiveTenants14d} icon={Building2} accent="destructive" />
          </div>

          <PlatformCard>
            <PlatformCardHeader
              title={`Actions requises (${alerts.items.length})`}
              description="Priorisez les commerces et reçus à traiter."
            />
            <PlatformCardBody flush>
              {alerts.items.length === 0 ? (
                <p className="plat-empty">Aucune alerte pour le moment.</p>
              ) : (
                <div className="plat-list">
                  {alerts.items.map((item, i) => (
                    <div key={i} className="plat-list-item">
                      <div>
                        <p className="plat-cell-primary">{item.tenantName ?? "Reçu en attente"}</p>
                        <p className="plat-cell-muted mt-0.5">{item.message}</p>
                      </div>
                      <div className="plat-toolbar">
                        {item.type === "receipt_pending" && item.receiptId && (
                          <Link href="/platform/payments">
                            <PlatformButton variant="secondary" size="sm">Valider</PlatformButton>
                          </Link>
                        )}
                        {item.tenantId && (
                          <Link href={`/platform/businesses/${item.tenantId}`}>
                            <PlatformButton size="sm">Voir commerce</PlatformButton>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PlatformCardBody>
          </PlatformCard>
        </>
      ) : null}
    </div>
  );
}
