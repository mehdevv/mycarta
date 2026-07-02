import { useMemo, useState } from "react";
import { Link } from "wouter";
import { usePlatformTenants } from "@/api/platform";
import type { PlatformTenantRow } from "@/api/platform";
import {
  PlatformPageHeader,
  PlatformCard,
  PlatformCardBody,
  StatusBadge,
  PlatformButton,
  PlatformSkeleton,
} from "@/components/platform/platform-ui";
import {
  TenantClientQrDialog,
  TenantDeleteDialog,
  TenantPlanDialog,
} from "@/components/platform/tenant-admin-dialogs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, QrCode, Crown, Trash2, Eye } from "lucide-react";
import { downloadCsv, formatDateFr } from "@/lib/platform-export";

type DialogKind = "qr" | "plan" | "delete" | null;

function exportTenantsCsv(rows: PlatformTenantRow[]) {
  downloadCsv(`carta-commerces-${new Date().toISOString().slice(0, 10)}.csv`, [
    ["Nom", "Slug", "Plan", "Statut", "Clients", "Cartes actives", "+7j", "Scans", "Fraude", "Employés", "Récomp. attente", "Onboarding", "Dernière activité", "Propriétaire", "Email", "Inscrit le"],
    ...rows.map((t) => [
      t.name,
      t.slug,
      t.planName,
      t.subscriptionStatus,
      t.clientCount,
      t.activeCardCount ?? t.clientCount,
      t.newClients7d ?? 0,
      t.scanCount,
      t.fraudScanCount ?? 0,
      t.workerCount,
      t.rewardsPending ?? 0,
      t.onboardingComplete ? "oui" : "non",
      formatDateFr(t.lastScanAt),
      t.ownerName ?? "",
      t.ownerEmail ?? "",
      formatDateFr(t.createdAt),
    ]),
  ]);
}

export default function PlatformTenantsPage() {
  const { data: tenants = [], isLoading, refetch } = usePlatformTenants();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTenant, setActiveTenant] = useState<PlatformTenantRow | null>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);

  const openDialog = (tenant: PlatformTenantRow, kind: DialogKind) => {
    setActiveTenant(tenant);
    setDialog(kind);
  };

  const closeDialog = () => {
    setDialog(null);
    setActiveTenant(null);
  };

  const filtered = useMemo(() => {
    return tenants.filter((t) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (t.ownerEmail?.toLowerCase().includes(q) ?? false);
      const matchesPlan = planFilter === "all" || t.planId === planFilter;
      const matchesStatus = statusFilter === "all" || t.subscriptionStatus === statusFilter;
      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [tenants, search, planFilter, statusFilter]);

  return (
    <div className="plat-stack">
      <PlatformPageHeader
        title="Commerces"
        description={`${tenants.length} boutique(s) inscrite(s) sur la plateforme.`}
        action={
          <PlatformButton variant="secondary" size="sm" className="gap-2" onClick={() => exportTenantsCsv(filtered)} disabled={!filtered.length}>
            <Download className="h-4 w-4" />
            Export CSV
          </PlatformButton>
        }
      />

      <div className="plat-toolbar">
        <div className="plat-search-wrap">
          <Search className="plat-search-icon" />
          <input
            type="search"
            className="plat-input"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="plat-select"><SelectValue placeholder="Plan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les plans</SelectItem>
            <SelectItem value="trial">Essai</SelectItem>
            <SelectItem value="boutique">Boutique</SelectItem>
            <SelectItem value="maison">Maison</SelectItem>
            <SelectItem value="prestige">Prestige</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="plat-select"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="trialing">Essai</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="expired">Expiré</SelectItem>
            <SelectItem value="past_due">En retard</SelectItem>
            <SelectItem value="canceled">Annulé</SelectItem>
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
            <p className="plat-empty">Aucun commerce trouvé.</p>
          ) : (
            <div className="plat-table-wrap">
              <table className="plat-table min-w-[1100px]">
                <thead>
                  <tr>
                    <th>Commerce</th>
                    <th>Plan</th>
                    <th>Statut</th>
                    <th className="text-right">Clients</th>
                    <th className="text-right">+7j</th>
                    <th className="text-right">Scans</th>
                    <th className="text-right">Fraude</th>
                    <th className="text-right">Équipe</th>
                    <th>Dernière activité</th>
                    <th className="text-center">Onb.</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <Link href={`/platform/businesses/${t.id}`} className="plat-link plat-cell-primary">{t.name}</Link>
                        <p className="plat-cell-mono plat-cell-muted">{t.slug}</p>
                        <p className="plat-cell-muted">{t.ownerEmail}</p>
                      </td>
                      <td>{t.planName}</td>
                      <td><StatusBadge status={t.subscriptionStatus} /></td>
                      <td className="text-right">{t.activeCardCount ?? t.clientCount}</td>
                      <td className="text-right plat-cell-success">+{t.newClients7d ?? 0}</td>
                      <td className="text-right">{t.scanCount}</td>
                      <td className="text-right plat-cell-danger">{t.fraudScanCount ?? 0}</td>
                      <td className="text-right">{t.workerCount}</td>
                      <td className="plat-cell-muted">{t.lastScanAt ? new Date(t.lastScanAt).toLocaleDateString("fr-DZ") : "—"}</td>
                      <td className="text-center">{t.onboardingComplete ? "✓" : "—"}</td>
                      <td className="text-right">
                        <div className="inline-flex items-center justify-end gap-0.5">
                          <PlatformButton
                            size="sm"
                            variant="secondary"
                            className="!px-2"
                            title="QR portail client"
                            onClick={() => openDialog(t, "qr")}
                          >
                            <QrCode className="h-3.5 w-3.5" />
                          </PlatformButton>
                          <PlatformButton
                            size="sm"
                            variant="secondary"
                            className="!px-2"
                            title="Changer le plan"
                            onClick={() => openDialog(t, "plan")}
                          >
                            <Crown className="h-3.5 w-3.5" />
                          </PlatformButton>
                          <Link
                            href={`/platform/businesses/${t.id}`}
                            className="plat-btn plat-btn--secondary plat-btn--sm !px-2 inline-flex items-center justify-center"
                            title="Détails"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          <PlatformButton
                            size="sm"
                            variant="danger"
                            className="!px-2"
                            title="Supprimer"
                            onClick={() => openDialog(t, "delete")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </PlatformButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PlatformCardBody>
      </PlatformCard>

      <TenantClientQrDialog
        tenant={activeTenant}
        open={dialog === "qr"}
        onOpenChange={(open) => !open && closeDialog()}
      />
      <TenantPlanDialog
        tenant={activeTenant}
        open={dialog === "plan"}
        onOpenChange={(open) => !open && closeDialog()}
        onSuccess={() => refetch()}
      />
      <TenantDeleteDialog
        tenant={activeTenant}
        open={dialog === "delete"}
        onOpenChange={(open) => !open && closeDialog()}
        onDeleted={() => refetch()}
      />
    </div>
  );
}
