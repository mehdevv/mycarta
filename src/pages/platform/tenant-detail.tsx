import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import {
  usePlatformTenantDetail,
  useOverrideTenantPlan,
  usePlatformTenantAction,
} from "@/api/platform";
import {
  PlatformKpi,
  PlatformPageHeader,
  PlatformCard,
  PlatformCardHeader,
  PlatformCardBody,
  StatusBadge,
  PlatformButton,
  PlatformSkeleton,
} from "@/components/platform/platform-ui";
import {
  TenantClientQrDialog,
  TenantDeleteDialog,
  SubscriptionDeleteDialog,
} from "@/components/platform/tenant-admin-dialogs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { PlanId } from "@/lib/pricing";
import { formatDzd } from "@/lib/pricing";
import { tenantClientLink } from "@/lib/links";
import { BrandedQrCode } from "@/components/shared/branded-qr-code";
import { useShopBranding } from "@/hooks/use-branding";
import { ArrowLeft, Users, QrCode, Gift, Package, ExternalLink, ShieldAlert, Coins, Trash2 } from "lucide-react";

export default function PlatformTenantDetailPage() {
  const params = useParams<{ id: string }>();
  const tenantId = params.id;
  const [, setLocation] = useLocation();
  const { data: tenant, isLoading, refetch } = usePlatformTenantDetail(tenantId);
  const { logoUrl } = useShopBranding(tenant?.slug);
  const overridePlan = useOverrideTenantPlan();
  const tenantAction = usePlatformTenantAction();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("maison");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [deleteSubscriptionId, setDeleteSubscriptionId] = useState<string | null>(null);

  useEffect(() => {
    if (tenant?.planId) {
      setSelectedPlan(tenant.planId as PlanId);
    }
  }, [tenant?.planId]);

  if (isLoading) {
    return (
      <div className="plat-stack">
        <PlatformSkeleton className="h-10 w-64" />
        <div className="plat-stat-grid">
          {Array(8).fill(0).map((_, i) => (
            <PlatformSkeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-center py-16">
        <p className="plat-cell-muted">Commerce introuvable.</p>
        <Link href="/platform/businesses">
          <PlatformButton variant="secondary" className="mt-4">Retour</PlatformButton>
        </Link>
      </div>
    );
  }

  const runAction = async (action: Parameters<typeof tenantAction.mutateAsync>[0]["action"], extra?: { days?: number }) => {
    try {
      await tenantAction.mutateAsync({ tenantId: tenant.id, action, ...extra });
      toast({ title: "Action effectuée" });
      if (action === "delete_tenant") setLocation("/platform/businesses");
      else refetch();
    } catch (e) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Échec", variant: "destructive" });
    }
  };

  const handleOverride = async () => {
    try {
      await overridePlan.mutateAsync({ tenantId: tenant.id, planId: selectedPlan });
      toast({ title: "Plan mis à jour", description: `${tenant.name} → ${selectedPlan}` });
      refetch();
    } catch (e) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Échec", variant: "destructive" });
    }
  };

  const clientEnrolUrl = tenantClientLink(tenant.slug);

  const subscriptionToDelete = deleteSubscriptionId
    ? tenant.subscriptions.find((s) => s.id === deleteSubscriptionId)
    : null;

  return (
    <div className="plat-stack">
      <Link href="/platform/businesses">
        <PlatformButton variant="secondary" size="sm" className="gap-1">
          <ArrowLeft className="h-4 w-4" />Commerces
        </PlatformButton>
      </Link>

      <PlatformPageHeader
        title={tenant.name}
        description={
          <>
            <span className="plat-cell-mono plat-cell-muted">{tenant.slug}</span>
            {" · "}<StatusBadge status={tenant.subscriptionStatus} />
            {tenant.subscriptionEndsAt && (
              <span className="plat-cell-muted ml-2">Fin abo {new Date(tenant.subscriptionEndsAt).toLocaleDateString("fr-DZ")}</span>
            )}
          </>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <PlatformButton size="sm" variant="secondary" className="gap-1.5" onClick={() => setQrOpen(true)}>
              <QrCode className="h-4 w-4" />QR client
            </PlatformButton>
            <a href={clientEnrolUrl} target="_blank" rel="noreferrer" className="plat-link inline-flex items-center gap-2 text-sm">
              <ExternalLink className="h-4 w-4" />Page publique
            </a>
          </div>
        }
      />

      <PlatformCard>
        <PlatformCardHeader title="QR portail client" />
        <PlatformCardBody className="flex flex-col sm:flex-row items-center gap-6">
          <div className="bg-white p-4 rounded-xl border shadow-sm shrink-0">
            <BrandedQrCode value={clientEnrolUrl} size={160} logoUrl={logoUrl} />
          </div>
          <div className="space-y-2 text-sm min-w-0 flex-1">
            <p className="plat-cell-muted">
              Code à imprimer ou afficher en caisse — les clients accèdent à l&apos;inscription sans application.
            </p>
            <p className="font-mono text-xs break-all opacity-70">{clientEnrolUrl}</p>
            <PlatformButton size="sm" variant="secondary" onClick={() => setQrOpen(true)}>
              Agrandir le QR
            </PlatformButton>
          </div>
        </PlatformCardBody>
      </PlatformCard>

      <div className="plat-stat-grid">
        <PlatformKpi title="Clients" value={tenant.clientCount} subtitle={`${tenant.activeCardCount ?? tenant.clientCount} actifs · ${tenant.blockedCardCount ?? 0} bloqués`} icon={Users} />
        <PlatformKpi title="Scans" value={tenant.scanCount} subtitle={`${tenant.scansToday} auj. · ${tenant.scansThisWeek ?? 0} sem.`} icon={QrCode} accent="secondary" />
        <PlatformKpi title="Récompenses" value={tenant.rewardCount ?? 0} subtitle={`${tenant.rewardsPending ?? 0} en attente`} icon={Gift} />
        <PlatformKpi title="Fraude" value={tenant.fraudScanCount ?? 0} icon={ShieldAlert} accent="destructive" />
        <PlatformKpi title="Croissance" value={`+${tenant.newClients7d ?? 0}`} subtitle={`+${tenant.newClients30d ?? 0} sur 30j`} icon={Users} accent="secondary" />
        <PlatformKpi title="Employés" value={tenant.workerCount} subtitle={`${tenant.inactiveWorkerCount ?? 0} inactifs`} icon={Package} accent="amber" />
        <PlatformKpi title="Timbres émis" value={tenant.totalStampsIssued ?? 0} icon={Coins} />
        <PlatformKpi title="Produits" value={tenant.productCount ?? 0} subtitle={`Limite ${tenant.planClientLimit ?? "∞"} clients`} icon={Package} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PlatformCard>
          <PlatformCardHeader title="Actions admin" />
          <PlatformCardBody>
            <div className="plat-toolbar">
              <PlatformButton size="sm" variant="secondary" onClick={() => runAction("extend_trial", { days: 7 })} disabled={tenantAction.isPending}>+7j essai</PlatformButton>
              <PlatformButton size="sm" variant="secondary" onClick={() => runAction("reset_onboarding")} disabled={tenantAction.isPending}>Reset onboarding</PlatformButton>
              <PlatformButton size="sm" variant="warning" onClick={() => runAction("suspend")} disabled={tenantAction.isPending}>Suspendre</PlatformButton>
              <PlatformButton size="sm" variant="danger" onClick={() => runAction("cancel_subscription")} disabled={tenantAction.isPending}>Annuler abo</PlatformButton>
              <PlatformButton size="sm" variant="danger" onClick={() => setDeleteOpen(true)}>Supprimer</PlatformButton>
            </div>
          </PlatformCardBody>
        </PlatformCard>

        <PlatformCard>
          <PlatformCardHeader title="Propriétaire & plan" />
          <PlatformCardBody className="space-y-4">
            {tenant.owner && (
              <div className="text-sm">
                <p className="plat-cell-primary font-medium">{tenant.owner.fullName}</p>
                <p className="plat-cell-muted">{tenant.owner.email}</p>
              </div>
            )}
            <p className="plat-cell-muted text-xs">
              Onboarding {tenant.onboardingComplete ? "✓" : "—"} · Tutoriel {tenant.dashboardTutorialComplete ? "✓" : "—"}
            </p>
            <div className="plat-toolbar items-end">
              <Select value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as PlanId)}>
                <SelectTrigger className="plat-select w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Essai</SelectItem>
                  <SelectItem value="boutique">Boutique</SelectItem>
                  <SelectItem value="maison">Maison</SelectItem>
                  <SelectItem value="prestige">Prestige</SelectItem>
                </SelectContent>
              </Select>
              <PlatformButton size="sm" onClick={handleOverride} disabled={overridePlan.isPending}>
                Promouvoir / changer plan
              </PlatformButton>
            </div>
          </PlatformCardBody>
        </PlatformCard>
      </div>

      {tenant.shopSettings && (
        <PlatformCard>
          <PlatformCardHeader title="Paramètres boutique" />
          <PlatformCardBody className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div><p className="plat-cell-muted">Seuil tampons</p><p className="plat-cell-primary">{tenant.shopSettings.stampThreshold}</p></div>
            <div><p className="plat-cell-muted">Max scans/jour</p><p className="plat-cell-primary">{tenant.shopSettings.maxScansPerDay}</p></div>
            <div><p className="plat-cell-muted">WhatsApp</p><p className="plat-cell-primary">{tenant.shopSettings.whatsappConfigured ? "Configuré" : "—"}</p></div>
            <div><p className="plat-cell-muted">Email</p><p className="plat-cell-primary">{tenant.shopSettings.emailConfigured ? "Configuré" : "—"}</p></div>
          </PlatformCardBody>
        </PlatformCard>
      )}

      {(tenant.workers?.length ?? 0) > 0 && (
        <PlatformCard>
          <PlatformCardHeader title="Employés" />
          <PlatformCardBody flush>
            <div className="plat-table-wrap">
              <table className="plat-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th className="text-right">Scans</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {tenant.workers!.map((w) => (
                    <tr key={w.id}>
                      <td className="plat-cell-primary">{w.fullName}</td>
                      <td>{w.email}</td>
                      <td className="text-right">{w.scanCount}</td>
                      <td className="plat-cell-muted">{w.isActive ? "Actif" : "Inactif"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PlatformCardBody>
        </PlatformCard>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <PlatformCard>
          <PlatformCardHeader title="Scans récents" />
          <PlatformCardBody className="space-y-0">
            {tenant.recentScans.length === 0 ? (
              <p className="plat-empty">Aucun scan.</p>
            ) : (
              tenant.recentScans.map((s) => (
                <div key={s.id} className="plat-kv-row items-center">
                  <div>
                    <p className="plat-cell-primary">{s.clientName ?? "—"}</p>
                    <p className="plat-cell-muted text-xs">{s.workerName && `${s.workerName} · `}{new Date(s.scannedAt).toLocaleString("fr-DZ")}</p>
                  </div>
                  <StatusBadge status={s.status === "approved" ? "active" : "rejected"} />
                </div>
              ))
            )}
          </PlatformCardBody>
        </PlatformCard>

        <PlatformCard>
          <PlatformCardHeader title="Cartes récentes" />
          <PlatformCardBody className="space-y-0">
            {(tenant.recentClients?.length ?? 0) === 0 ? (
              <p className="plat-empty">Aucune carte.</p>
            ) : (
              tenant.recentClients!.map((c) => (
                <div key={c.id} className="plat-kv-row items-center">
                  <div>
                    <p className="plat-cell-primary">{c.fullName}</p>
                    <p className="plat-cell-mono plat-cell-muted text-xs">{c.cardCode}</p>
                  </div>
                  <span className="plat-cell-muted">{c.totalStamps} tampons</span>
                </div>
              ))
            )}
          </PlatformCardBody>
        </PlatformCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PlatformCard>
          <PlatformCardHeader title="Abonnements" />
          <PlatformCardBody className="space-y-3">
            {tenant.subscriptions.map((s) => (
              <div key={s.id} className="plat-meta-box">
                <div className="flex justify-between gap-2 items-start">
                  <span className="plat-cell-primary">{s.planId}</span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={s.status} />
                    <PlatformButton
                      size="sm"
                      variant="danger"
                      className="!px-2"
                      title="Supprimer l'abonnement"
                      onClick={() => setDeleteSubscriptionId(s.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </PlatformButton>
                  </div>
                </div>
                <p className="plat-cell-muted mt-1">{formatDzd(s.amountDzd)} · {s.billingPeriod}</p>
                {s.chargilyPaymentId && <p className="plat-cell-mono plat-cell-muted text-xs mt-1">Chargily: {s.chargilyPaymentId}</p>}
              </div>
            ))}
          </PlatformCardBody>
        </PlatformCard>
        <PlatformCard>
          <PlatformCardHeader title="Reçus" />
          <PlatformCardBody className="space-y-0">
            {tenant.receipts.map((r) => (
              <div key={r.id} className="plat-kv-row items-center">
                <span className="plat-cell-primary">{formatDzd(r.amountDzd)}</span>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </PlatformCardBody>
        </PlatformCard>
      </div>

      <TenantClientQrDialog
        tenant={tenant}
        open={qrOpen}
        onOpenChange={setQrOpen}
      />

      <TenantDeleteDialog
        tenant={tenant}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => setLocation("/platform/businesses")}
      />

      <SubscriptionDeleteDialog
        subscription={
          subscriptionToDelete
            ? {
                id: subscriptionToDelete.id,
                tenant_id: tenant.id,
                plan_id: subscriptionToDelete.planId,
                status: subscriptionToDelete.status,
                amount_dzd: subscriptionToDelete.amountDzd,
                billing_period: subscriptionToDelete.billingPeriod,
                tenants: { name: tenant.name, slug: tenant.slug },
              }
            : null
        }
        open={!!deleteSubscriptionId}
        onOpenChange={(open) => !open && setDeleteSubscriptionId(null)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
