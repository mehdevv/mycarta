import { useMemo, useState } from "react";
import { usePlatformSubscriptions } from "@/api/platform";
import type { PlatformSubscription } from "@/api/platform";
import { SubscriptionDeleteDialog } from "@/components/platform/tenant-admin-dialogs";
import {
  PlatformPageHeader,
  PlatformCard,
  PlatformCardBody,
  StatusBadge,
  PlatformButton,
  PlatformSkeleton,
} from "@/components/platform/platform-ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDzd } from "@/lib/pricing";
import { downloadCsv } from "@/lib/platform-export";
import { Download, Trash2 } from "lucide-react";

export default function PlatformSubscriptionsPage() {
  const { data: subscriptions = [], isLoading, refetch } = usePlatformSubscriptions();
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<PlatformSubscription | null>(null);

  const filtered = useMemo(() => {
    return subscriptions.filter((s) => {
      const matchStatus = statusFilter === "all" || s.status === statusFilter;
      const matchPlan = planFilter === "all" || s.plan_id === planFilter;
      return matchStatus && matchPlan;
    });
  }, [subscriptions, statusFilter, planFilter]);

  const activeCount = subscriptions.filter((s) => s.status === "active").length;
  const totalRevenue = subscriptions.filter((s) => s.status === "active").reduce((sum, s) => sum + s.amount_dzd, 0);

  const exportCsv = () => {
    downloadCsv(`carta-abonnements.csv`, [
      ["Commerce", "Slug", "Plan", "Période", "Montant", "Statut", "Chargily ID", "Début", "Fin", "Créé le"],
      ...filtered.map((s) => [
        s.tenants?.name ?? "",
        s.tenants?.slug ?? "",
        s.plans?.name ?? s.plan_id,
        s.billing_period,
        s.amount_dzd,
        s.status,
        s.chargily_payment_id ?? "",
        s.starts_at ?? "",
        s.ends_at ?? "",
        s.created_at,
      ]),
    ]);
  };

  return (
    <div className="plat-stack">
      <PlatformPageHeader
        title="Abonnements"
        description={`${activeCount} actif(s) · ${formatDzd(totalRevenue)} volume actif`}
        action={
          <PlatformButton variant="secondary" size="sm" className="gap-2" onClick={exportCsv}>
            <Download className="h-4 w-4" />Export CSV
          </PlatformButton>
        }
      />

      <div className="plat-toolbar">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="plat-select"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="canceled">Annulé</SelectItem>
            <SelectItem value="failed">Échoué</SelectItem>
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="plat-select"><SelectValue placeholder="Plan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous plans</SelectItem>
            <SelectItem value="boutique">Boutique</SelectItem>
            <SelectItem value="maison">Maison</SelectItem>
            <SelectItem value="prestige">Prestige</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <PlatformCard>
        <PlatformCardBody flush>
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array(5).fill(0).map((_, i) => (
                <PlatformSkeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="plat-empty">Aucun abonnement.</p>
          ) : (
            <div className="plat-table-wrap">
              <table className="plat-table min-w-[900px]">
                <thead>
                  <tr>
                    <th>Commerce</th>
                    <th>Plan</th>
                    <th>Période</th>
                    <th>Montant</th>
                    <th>Statut</th>
                    <th>Chargily</th>
                    <th>Fin</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <p className="plat-cell-primary">{s.tenants?.name ?? "—"}</p>
                        <p className="plat-cell-mono plat-cell-muted">{s.tenants?.slug}</p>
                      </td>
                      <td>{s.plans?.name ?? s.plan_id}</td>
                      <td>{s.billing_period === "annual" ? "Annuel" : "Mensuel"}</td>
                      <td className="plat-cell-primary">{formatDzd(s.amount_dzd)}</td>
                      <td><StatusBadge status={s.status} /></td>
                      <td className="plat-cell-mono plat-cell-muted max-w-[120px] truncate">{s.chargily_payment_id ?? "—"}</td>
                      <td className="plat-cell-muted">{s.ends_at ? new Date(s.ends_at).toLocaleDateString("fr-DZ") : "—"}</td>
                      <td className="text-right">
                        <PlatformButton
                          size="sm"
                          variant="danger"
                          className="!px-2"
                          title="Supprimer l'abonnement"
                          onClick={() => setDeleteTarget(s)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </PlatformButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PlatformCardBody>
      </PlatformCard>

      <SubscriptionDeleteDialog
        subscription={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
