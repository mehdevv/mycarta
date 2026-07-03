import { useMemo, useState } from "react";
import {
  usePlatformTenantClients,
  usePlatformTenantScans,
  type PlatformTenantClientRow,
  type PlatformTenantScanRow,
} from "@/api/platform";
import {
  PlatformCard,
  PlatformCardHeader,
  PlatformCardBody,
  PlatformButton,
  PlatformSkeleton,
  StatusBadge,
} from "@/components/platform/platform-ui";
import { formatDzd } from "@/lib/pricing";
import { Search } from "lucide-react";

function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleString("fr-DZ");
}

function fmtDateShort(v: string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("fr-DZ");
}

function ScanStatusBadge({ status }: { status: string }) {
  if (status === "approved") return <StatusBadge status="active" />;
  return <StatusBadge status="rejected" />;
}

export function TenantClientsPanel({ tenantId, totalHint }: { tenantId: string; totalHint?: number }) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = usePlatformTenantClients(tenantId);
  const [search, setSearch] = useState("");

  const clients = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );
  const total = data?.pages[0]?.total ?? totalHint ?? clients.length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.cardCode.includes(q) ||
        (c.phone?.includes(q) ?? false) ||
        (c.email?.toLowerCase().includes(q) ?? false),
    );
  }, [clients, search]);

  return (
    <PlatformCard>
      <PlatformCardHeader
        title={`Clients individuels (${total})`}
        description="Chaque carte fidélité — données complètes."
      />
      <PlatformCardBody flush>
        <div className="p-4 border-b border-white/10">
          <div className="plat-search-wrap">
            <Search className="plat-search-icon" />
            <input
              type="search"
              className="plat-input"
              placeholder="Filtrer par nom, code, téléphone, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {isLoading ? (
          <PlatformSkeleton className="h-48 m-4" />
        ) : filtered.length === 0 ? (
          <p className="plat-empty p-6">Aucun client.</p>
        ) : (
          <div className="plat-table-wrap max-h-[70vh] overflow-y-auto">
            <table className="plat-table min-w-[1200px]">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nom</th>
                  <th>Code</th>
                  <th>Téléphone</th>
                  <th>Email</th>
                  <th className="text-right">Tampons</th>
                  <th className="text-right">Cycle</th>
                  <th className="text-right">Dépenses</th>
                  <th className="text-right">Récomp.</th>
                  <th>Statut</th>
                  <th>Notes</th>
                  <th>Inscrit</th>
                  <th>Dernier scan</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <ClientRow key={c.id} client={c} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {hasNextPage && !search && (
          <div className="p-4 border-t border-white/10 text-center">
            <PlatformButton
              variant="secondary"
              size="sm"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "Chargement…" : `Charger plus (${clients.length} / ${total})`}
            </PlatformButton>
          </div>
        )}
      </PlatformCardBody>
    </PlatformCard>
  );
}

function ClientRow({ client: c }: { client: PlatformTenantClientRow }) {
  return (
    <tr>
      <td className="plat-cell-mono text-xs opacity-60">{c.id.slice(0, 8)}…</td>
      <td className="plat-cell-primary">{c.fullName}</td>
      <td className="plat-cell-mono">{c.cardCode}</td>
      <td>{c.phone ?? "—"}</td>
      <td>{c.email ?? "—"}</td>
      <td className="text-right">{c.totalStamps}</td>
      <td className="text-right">{c.currentCycleStamps}</td>
      <td className="text-right">
        {c.totalSpendDzd != null ? formatDzd(Number(c.totalSpendDzd)) : "—"}
      </td>
      <td className="text-right">{c.totalRewardsEarned}</td>
      <td>{c.isBlocked ? <span className="text-red-400">Bloqué</span> : "Actif"}</td>
      <td className="plat-cell-muted text-xs max-w-[120px] truncate" title={c.notes ?? undefined}>
        {c.notes ?? "—"}
      </td>
      <td className="plat-cell-muted text-xs">{fmtDateShort(c.enrolledAt)}</td>
      <td className="plat-cell-muted text-xs">{fmtDateShort(c.lastScanAt)}</td>
    </tr>
  );
}

export function TenantScansPanel({ tenantId, totalHint }: { tenantId: string; totalHint?: number }) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = usePlatformTenantScans(tenantId);

  const scans = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const total = data?.pages[0]?.total ?? totalHint ?? scans.length;

  return (
    <PlatformCard>
      <PlatformCardHeader title={`Historique scans (${total})`} description="Chaque scan enregistré." />
      <PlatformCardBody flush>
        {isLoading ? (
          <PlatformSkeleton className="h-48 m-4" />
        ) : scans.length === 0 ? (
          <p className="plat-empty p-6">Aucun scan.</p>
        ) : (
          <div className="plat-table-wrap max-h-[70vh] overflow-y-auto">
            <table className="plat-table min-w-[1100px]">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Code</th>
                  <th>Worker</th>
                  <th>Type</th>
                  <th>Statut</th>
                  <th className="text-right">Tampons</th>
                  <th className="text-right">Montant</th>
                  <th>Récomp.</th>
                  <th>Motif / notes</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((s) => (
                  <ScanRow key={s.id} scan={s} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {hasNextPage && (
          <div className="p-4 border-t border-white/10 text-center">
            <PlatformButton
              variant="secondary"
              size="sm"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "Chargement…" : `Charger plus (${scans.length} / ${total})`}
            </PlatformButton>
          </div>
        )}
      </PlatformCardBody>
    </PlatformCard>
  );
}

function ScanRow({ scan: s }: { scan: PlatformTenantScanRow }) {
  return (
    <tr>
      <td className="plat-cell-muted text-xs whitespace-nowrap">{fmtDate(s.scannedAt)}</td>
      <td className="plat-cell-primary">{s.clientName ?? "—"}</td>
      <td className="plat-cell-mono">{s.clientCardCode ?? "—"}</td>
      <td>{s.workerName ?? "—"}</td>
      <td className="plat-cell-muted text-xs">{s.scanType}</td>
      <td><ScanStatusBadge status={s.status} /></td>
      <td className="text-right">{s.stampsAdded}</td>
      <td className="text-right">
        {s.purchaseAmountDzd != null ? formatDzd(s.purchaseAmountDzd) : "—"}
      </td>
      <td>{s.rewardTriggered ? "Oui" : "—"}</td>
      <td className="plat-cell-muted text-xs max-w-[160px] truncate" title={s.blockReason ?? s.reviewNotes ?? undefined}>
        {s.blockReason ?? s.reviewNotes ?? "—"}
      </td>
    </tr>
  );
}

export function TenantListQuickInfo({
  tenant,
}: {
  tenant: {
    id: string;
    ownerName?: string | null;
    ownerEmail?: string | null;
    ownerPhone?: string | null;
    ownerProfilePhone?: string | null;
    billingFullName?: string | null;
    billingPhone?: string | null;
    billingEmail?: string | null;
    trialEndsAt?: string | null;
    subscriptionEndsAt?: string | null;
    assignedRepName?: string | null;
    affiliateName?: string | null;
    affiliateCodeUsed?: string | null;
    createdAt: string;
    clientCount: number;
    scanCount: number;
  };
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 p-4 bg-white/[0.02] text-sm">
      <div>
        <p className="plat-label">Propriétaire</p>
        <p className="plat-cell-primary">{tenant.ownerName ?? "—"}</p>
        <p className="plat-cell-muted">{tenant.ownerEmail}</p>
        <p className="plat-cell-muted">{tenant.ownerProfilePhone ?? tenant.ownerPhone ?? "—"}</p>
      </div>
      <div>
        <p className="plat-label">Facturation</p>
        <p className="plat-cell-primary">{tenant.billingFullName ?? "—"}</p>
        <p className="plat-cell-muted">{tenant.billingEmail}</p>
        <p className="plat-cell-muted">{tenant.billingPhone ?? "—"}</p>
      </div>
      <div>
        <p className="plat-label">Accès</p>
        <p className="plat-cell-muted">Essai → {tenant.trialEndsAt ? fmtDateShort(tenant.trialEndsAt) : "—"}</p>
        <p className="plat-cell-muted">Abo → {tenant.subscriptionEndsAt ? fmtDateShort(tenant.subscriptionEndsAt) : "—"}</p>
        <p className="plat-cell-muted">Inscrit {fmtDateShort(tenant.createdAt)}</p>
      </div>
      <div>
        <p className="plat-label">Attribution</p>
        <p className="plat-cell-muted">Commercial: {tenant.assignedRepName ?? "—"}</p>
        <p className="plat-cell-muted">
          Affilié: {tenant.affiliateName ?? "—"}
          {tenant.affiliateCodeUsed ? ` (${tenant.affiliateCodeUsed})` : ""}
        </p>
        <p className="plat-cell-muted">{tenant.clientCount} clients · {tenant.scanCount} scans</p>
      </div>
    </div>
  );
}
