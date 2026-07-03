import { useAffiliateDashboard } from "@/api/affiliate";
import {
  PlatformPageHeader,
  PlatformCard,
  PlatformCardBody,
  PlatformSkeleton,
} from "@/components/platform/platform-ui";
import { PLANS } from "@/lib/pricing";

const STATUS_LABELS: Record<string, string> = {
  trialing: "Essai",
  active: "Actif",
  past_due: "En retard",
  canceled: "Annulé",
  expired: "Expiré",
};

export default function AffiliateReferralsPage() {
  const { data, isLoading, error } = useAffiliateDashboard();

  return (
    <div className="plat-stack">
      <PlatformPageHeader
        title="Parrainages"
        description="Commerces inscrits via votre lien partenaire."
      />

      {error && (
        <p className="text-sm text-red-400">Impossible de charger les parrainages.</p>
      )}

      <PlatformCard>
        <PlatformCardBody flush>
          {isLoading ? (
            <PlatformSkeleton className="h-48 m-4" />
          ) : !data?.referrals?.length ? (
            <p className="plat-empty p-6">Aucun parrainage pour le moment.</p>
          ) : (
            <div className="plat-list">
              {data.referrals.map((r) => {
                const planName = PLANS.find((p) => p.id === r.plan_id)?.name ?? r.plan_id;
                return (
                  <div key={r.tenant_id} className="plat-list-item">
                    <div>
                      <p className="plat-cell-primary">{r.business_name}</p>
                      <p className="plat-cell-muted text-sm">
                        {planName} · {STATUS_LABELS[r.subscription_status] ?? r.subscription_status}
                      </p>
                      <p className="plat-cell-muted text-xs">
                        Inscrit le {new Date(r.created_at).toLocaleDateString("fr-DZ")}
                        {r.affiliate_first_paid_at
                          ? ` · 1er paiement ${new Date(r.affiliate_first_paid_at).toLocaleDateString("fr-DZ")}`
                          : " · Pas encore payé"}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      {r.benefit_days_left != null ? (
                        <span className="plat-badge">{r.benefit_days_left} j restants</span>
                      ) : (
                        <span className="plat-badge">Essai</span>
                      )}
                      <p className="plat-cell-muted text-xs mt-1">
                        Commissions {r.affiliate_commission_payments_count}/3
                      </p>
                    </div>
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
