import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import {
  usePlatformTenantDetail,
  useOverrideTenantPlan,
  usePlatformTenantAction,
} from "@/api/platform";
import { useAssignTenantSalesRep, useSalesReps } from "@/api/sales";
import {
  PlatformKpi,
  PlatformPageHeader,
  PlatformCard,
  PlatformCardHeader,
  PlatformCardBody,
  StatusBadge,
  PlatformButton,
  PlatformSkeleton,
  PlatformTabs,
} from "@/components/platform/platform-ui";
import {
  TenantClientQrDialog,
  TenantDeleteDialog,
  SubscriptionDeleteDialog,
} from "@/components/platform/tenant-admin-dialogs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { PlanId } from "@/lib/pricing";
import { formatDzd, PLANS } from "@/lib/pricing";
import { tenantClientLink } from "@/lib/links";
import { BrandedQrCode } from "@/components/shared/branded-qr-code";
import { useShopBranding } from "@/hooks/use-branding";
import {
  TenantClientsPanel,
  TenantScansPanel,
} from "@/components/platform/tenant-dossier-panels";
import {
  ArrowLeft,
  Users,
  QrCode,
  Gift,
  Package,
  ExternalLink,
  ShieldAlert,
  CreditCard,
  Trash2,
  Download,
} from "lucide-react";

type Tab = "full" | "overview" | "contact" | "loyalty" | "clients" | "activity" | "billing";

function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleString("fr-DZ");
}

function fmtDateShort(v: string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("fr-DZ");
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="plat-kv-row items-start gap-4">
      <span className="plat-cell-muted text-sm shrink-0 min-w-[140px]">{label}</span>
      <span className="plat-cell-primary text-sm text-right break-all">{value ?? "—"}</span>
    </div>
  );
}

function queryErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (error instanceof Error) return error.message;
  return "Erreur serveur";
}

export default function PlatformTenantDetailPage() {
  const params = useParams<{ id: string }>();
  const tenantId = params.id;
  const [, setLocation] = useLocation();
  const { data: tenant, isLoading, error, refetch } = usePlatformTenantDetail(tenantId);
  const { logoUrl } = useShopBranding(tenant?.slug);
  const overridePlan = useOverrideTenantPlan();
  const tenantAction = usePlatformTenantAction();
  const { data: reps = [] } = useSalesReps();
  const assignRep = useAssignTenantSalesRep();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("full");
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("maison");
  const [selectedRepId, setSelectedRepId] = useState<string>("none");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [deleteSubscriptionId, setDeleteSubscriptionId] = useState<string | null>(null);

  useEffect(() => {
    if (tenant?.planId) setSelectedPlan(tenant.planId as PlanId);
  }, [tenant?.planId]);

  useEffect(() => {
    setSelectedRepId(tenant?.salesRep?.id ?? "none");
  }, [tenant?.salesRep?.id]);

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
      <div className="text-center py-16 space-y-4">
        <p className="plat-cell-muted">
          {error
            ? `Impossible de charger ce commerce. ${queryErrorMessage(error)}`
            : "Commerce introuvable."}
        </p>
        {error && (
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Exécutez la migration 031 dans le SQL Editor Supabase (projet qealyijgeosyvmfpojzq), puis rechargez.
          </p>
        )}
        <Link href="/businesses">
          <PlatformButton variant="secondary" className="mt-4">Retour</PlatformButton>
        </Link>
      </div>
    );
  }

  const runAction = async (action: Parameters<typeof tenantAction.mutateAsync>[0]["action"], extra?: { days?: number }) => {
    try {
      await tenantAction.mutateAsync({ tenantId: tenant.id, action, ...extra });
      toast({ title: "Action effectuée" });
      if (action === "delete_tenant") setLocation("/businesses");
      else refetch();
    } catch (e) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Échec", variant: "destructive" });
    }
  };

  const handleOverride = async () => {
    try {
      await overridePlan.mutateAsync({ tenantId: tenant.id, planId: selectedPlan });
      toast({ title: "Plan mis à jour" });
      refetch();
    } catch (e) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Échec", variant: "destructive" });
    }
  };

  const handleAssignRep = async () => {
    try {
      await assignRep.mutateAsync({
        tenantId: tenant.id,
        repId: selectedRepId === "none" ? null : selectedRepId,
      });
      toast({ title: "Commercial assigné" });
      refetch();
    } catch (e) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Échec", variant: "destructive" });
    }
  };

  const clientEnrolUrl = tenantClientLink(tenant.slug);
  const subscriptionToDelete = deleteSubscriptionId
    ? tenant.subscriptions.find((s) => s.id === deleteSubscriptionId)
    : null;
  const planName = (id: string) => PLANS.find((p) => p.id === id)?.name ?? id;

  const show = (section: Tab | Tab[]) =>
    tab === "full" || (Array.isArray(section) ? section.includes(tab) : tab === section);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(tenant, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `carta-${tenant.slug}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="plat-stack">
      <Link href="/businesses">
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
            {" · "}{planName(tenant.planId)}
            {tenant.subscriptionEndsAt && (
              <span className="plat-cell-muted ml-2">Fin {fmtDateShort(tenant.subscriptionEndsAt)}</span>
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
            <PlatformButton size="sm" variant="secondary" className="gap-1.5" onClick={exportJson}>
              <Download className="h-4 w-4" />Export JSON
            </PlatformButton>
          </div>
        }
      />

      <PlatformTabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "full", label: "Fiche complète" },
          { value: "overview", label: "Vue d'ensemble" },
          { value: "contact", label: "Contact & CRM" },
          { value: "loyalty", label: "Fidélité" },
          { value: "clients", label: `Clients (${tenant.clientCount})` },
          { value: "activity", label: "Activité" },
          { value: "billing", label: "Paiements" },
        ]}
      />

      {show("overview") && (
        <>
          <div className="plat-stat-grid">
            <PlatformKpi title="Clients" value={tenant.clientCount} subtitle={`${tenant.activeCardCount ?? tenant.clientCount} actifs · ${tenant.blockedCardCount ?? 0} bloqués`} icon={Users} />
            <PlatformKpi title="Scans" value={tenant.scanCount} subtitle={`${tenant.scansToday} auj. · ${tenant.scansThisWeek ?? 0} sem.`} icon={QrCode} accent="secondary" />
            <PlatformKpi title="Récompenses" value={tenant.rewardCount ?? 0} subtitle={`${tenant.rewardsPending ?? 0} en attente`} icon={Gift} />
            <PlatformKpi title="Fraude" value={tenant.fraudScanCount ?? 0} icon={ShieldAlert} accent="destructive" />
            <PlatformKpi title="Croissance" value={`+${tenant.newClients7d ?? 0}`} subtitle={`+${tenant.newClients30d ?? 0} sur 30j`} icon={Users} accent="secondary" />
            <PlatformKpi title="Employés" value={tenant.workerCount} subtitle={`${tenant.inactiveWorkerCount ?? 0} inactifs`} icon={Package} accent="amber" />
            <PlatformKpi title="Revenus validés" value={formatDzd(tenant.totalRevenueApprovedDzd ?? 0)} icon={CreditCard} />
            <PlatformKpi title="Produits" value={tenant.productCount ?? 0} subtitle={`Limite ${tenant.planClientLimit ?? "∞"} clients`} icon={Package} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <PlatformCard>
              <PlatformCardHeader title="Identité" />
              <PlatformCardBody className="space-y-0">
                <DetailRow label="ID" value={<span className="font-mono text-xs">{tenant.id}</span>} />
                <DetailRow label="Slug" value={tenant.slug} />
                <DetailRow label="Créé le" value={fmtDate(tenant.createdAt)} />
                <DetailRow label="Mis à jour" value={fmtDate(tenant.updatedAt)} />
                <DetailRow label="Couleur marque" value={tenant.brandColor} />
                <DetailRow label="Essai jusqu'au" value={fmtDateShort(tenant.trialEndsAt)} />
                <DetailRow label="Onboarding" value={tenant.onboardingComplete ? "Terminé" : "En cours"} />
                <DetailRow label="Tutoriel dashboard" value={tenant.dashboardTutorialComplete ? "Terminé" : "—"} />
                <DetailRow label="Dernier scan" value={fmtDate(tenant.lastScanAt)} />
                <DetailRow label="Dernière inscription client" value={fmtDate(tenant.lastEnrolmentAt)} />
              </PlatformCardBody>
            </PlatformCard>

            <PlatformCard>
              <PlatformCardHeader title="QR portail client" />
              <PlatformCardBody className="flex flex-col sm:flex-row items-center gap-6">
                <div className="bg-white p-4 rounded-xl border shadow-sm shrink-0">
                  <BrandedQrCode value={clientEnrolUrl} size={140} logoUrl={logoUrl} />
                </div>
                <div className="space-y-2 text-sm min-w-0 flex-1">
                  <p className="font-mono text-xs break-all opacity-70">{clientEnrolUrl}</p>
                  <PlatformButton size="sm" variant="secondary" onClick={() => setQrOpen(true)}>Agrandir</PlatformButton>
                </div>
              </PlatformCardBody>
            </PlatformCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <PlatformCard>
              <PlatformCardHeader title="Actions admin" />
              <PlatformCardBody>
                <div className="plat-toolbar flex-wrap">
                  <PlatformButton size="sm" variant="secondary" onClick={() => runAction("extend_trial", { days: 7 })} disabled={tenantAction.isPending}>+7j essai</PlatformButton>
                  <PlatformButton size="sm" variant="secondary" onClick={() => runAction("reset_onboarding")} disabled={tenantAction.isPending}>Reset onboarding</PlatformButton>
                  <PlatformButton size="sm" variant="warning" onClick={() => runAction("suspend")} disabled={tenantAction.isPending}>Suspendre</PlatformButton>
                  <PlatformButton size="sm" variant="danger" onClick={() => runAction("cancel_subscription")} disabled={tenantAction.isPending}>Annuler abo</PlatformButton>
                  <PlatformButton size="sm" variant="danger" onClick={() => setDeleteOpen(true)}>Supprimer</PlatformButton>
                </div>
              </PlatformCardBody>
            </PlatformCard>

            <PlatformCard>
              <PlatformCardHeader title="Plan & limites" />
              <PlatformCardBody className="space-y-4">
                <DetailRow label="Plan actuel" value={`${planName(tenant.planId)} (${tenant.subscriptionStatus})`} />
                <DetailRow label="Prix mensuel" value={tenant.planMonthlyDzd != null ? formatDzd(tenant.planMonthlyDzd) : "—"} />
                <DetailRow label="Limite clients" value={tenant.planClientLimit ?? "∞"} />
                <DetailRow label="Limite workers" value={tenant.planWorkerLimit ?? "∞"} />
                <div className="plat-toolbar items-end pt-2">
                  <Select value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as PlanId)}>
                    <SelectTrigger className="plat-select w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">Essai</SelectItem>
                      <SelectItem value="boutique">Boutique</SelectItem>
                      <SelectItem value="maison">Maison</SelectItem>
                      <SelectItem value="prestige">Prestige</SelectItem>
                    </SelectContent>
                  </Select>
                  <PlatformButton size="sm" onClick={handleOverride} disabled={overridePlan.isPending}>Appliquer</PlatformButton>
                </div>
              </PlatformCardBody>
            </PlatformCard>
          </div>
        </>
      )}

      {show("contact") && (
        <div className="grid gap-6 lg:grid-cols-2">
          <PlatformCard>
            <PlatformCardHeader title="Propriétaire" />
            <PlatformCardBody className="space-y-0">
              {tenant.owner ? (
                <>
                  <DetailRow label="Nom" value={tenant.owner.fullName} />
                  <DetailRow label="Email" value={tenant.owner.email} />
                  <DetailRow label="Téléphone profil" value={tenant.owner.phone} />
                  <DetailRow label="Téléphone commerce" value={tenant.ownerPhone} />
                  <DetailRow label="Compte actif" value={tenant.owner.isActive ? "Oui" : "Non"} />
                  <DetailRow label="Inscrit le" value={fmtDate(tenant.owner.createdAt)} />
                </>
              ) : (
                <p className="plat-empty">Aucun propriétaire.</p>
              )}
            </PlatformCardBody>
          </PlatformCard>

          <PlatformCard>
            <PlatformCardHeader title="Facturation" />
            <PlatformCardBody className="space-y-0">
              <DetailRow label="Nom" value={tenant.billing?.fullName} />
              <DetailRow label="Téléphone" value={tenant.billing?.phone} />
              <DetailRow label="Email" value={tenant.billing?.email} />
              <DetailRow label="Adresse" value={tenant.billing?.address} />
              <DetailRow label="Chargily customer" value={tenant.chargilyCustomerId} />
            </PlatformCardBody>
          </PlatformCard>

          <PlatformCard>
            <PlatformCardHeader title="Commercial assigné" />
            <PlatformCardBody className="space-y-4">
              {tenant.salesRep ? (
                <div className="space-y-0">
                  <DetailRow label="Nom" value={tenant.salesRep.fullName} />
                  <DetailRow label="Email" value={tenant.salesRep.email} />
                  <DetailRow label="Téléphone" value={tenant.salesRep.phone} />
                </div>
              ) : (
                <p className="plat-cell-muted text-sm">Aucun commercial assigné.</p>
              )}
              {tenant.salesFollowUp && (
                <div className="pt-3 border-t border-white/10 space-y-0">
                  <p className="plat-label mb-2">Suivi CRM</p>
                  <DetailRow label="Statut" value={tenant.salesFollowUp.status} />
                  <DetailRow label="Priorité" value={tenant.salesFollowUp.priority} />
                  <DetailRow label="Prochain contact" value={fmtDate(tenant.salesFollowUp.nextFollowUpAt)} />
                  <DetailRow label="Dernier contact" value={fmtDate(tenant.salesFollowUp.lastContactAt)} />
                  <DetailRow label="Upsell plan" value={tenant.salesFollowUp.upsellPlanId} />
                  {tenant.salesFollowUp.notes && (
                    <p className="text-sm plat-cell-muted mt-2 whitespace-pre-wrap">{tenant.salesFollowUp.notes}</p>
                  )}
                </div>
              )}
              <div className="plat-toolbar items-end">
                <Select value={selectedRepId} onValueChange={setSelectedRepId}>
                  <SelectTrigger className="plat-select w-56"><SelectValue placeholder="Aucun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {reps.filter((r) => r.is_active).map((rep) => (
                      <SelectItem key={rep.id} value={rep.id}>{rep.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <PlatformButton size="sm" variant="secondary" onClick={handleAssignRep} disabled={assignRep.isPending}>
                  Assigner
                </PlatformButton>
              </div>
            </PlatformCardBody>
          </PlatformCard>

          <PlatformCard>
            <PlatformCardHeader title="Parrainage affilié" />
            <PlatformCardBody className="space-y-0">
              {tenant.affiliate ? (
                <>
                  <DetailRow label="Partenaire" value={tenant.affiliate.fullName} />
                  <DetailRow label="Code" value={tenant.affiliate.affiliateCode} />
                  <DetailRow label="Réseau" value={tenant.affiliate.socialHandle ? `@${tenant.affiliate.socialHandle}` : "—"} />
                  <DetailRow label="Code utilisé" value={tenant.affiliateCodeUsed} />
                  <DetailRow label="1er paiement" value={fmtDate(tenant.affiliateFirstPaidAt)} />
                  <DetailRow label="Avantage jusqu'au" value={fmtDateShort(tenant.affiliateBenefitEndsAt)} />
                  <DetailRow label="Commissions payées" value={`${tenant.affiliateCommissionPaymentsCount ?? 0} / 3`} />
                </>
              ) : (
                <p className="plat-empty">Pas de parrainage affilié.</p>
              )}
            </PlatformCardBody>
          </PlatformCard>

          {(tenant.workers?.length ?? 0) > 0 && (
            <PlatformCard className="lg:col-span-2">
              <PlatformCardHeader title={`Employés (${tenant.workers!.length})`} />
              <PlatformCardBody flush>
                <div className="plat-table-wrap">
                  <table className="plat-table">
                    <thead>
                      <tr>
                        <th>Nom</th>
                        <th>Email</th>
                        <th>Téléphone</th>
                        <th className="text-right">Scans</th>
                        <th>Statut</th>
                        <th>Créé le</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenant.workers!.map((w) => (
                        <tr key={w.id}>
                          <td className="plat-cell-primary">{w.fullName}</td>
                          <td>{w.email}</td>
                          <td>{w.phone ?? "—"}</td>
                          <td className="text-right">{w.scanCount}</td>
                          <td>{w.isActive ? "Actif" : "Inactif"}</td>
                          <td className="plat-cell-muted">{fmtDateShort(w.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </PlatformCardBody>
            </PlatformCard>
          )}
        </div>
      )}

      {show("loyalty") && (
        <div className="grid gap-6 lg:grid-cols-2">
          <PlatformCard>
            <PlatformCardHeader title="Paramètres boutique" />
            <PlatformCardBody className="space-y-0">
              {tenant.shopSettings ? (
                <>
                  <DetailRow label="Nom affiché" value={tenant.shopSettings.businessName} />
                  <DetailRow label="Devise" value={tenant.shopSettings.currency} />
                  <DetailRow label="Fuseau" value={tenant.shopSettings.timezone} />
                  <DetailRow label="Langue clients" value={tenant.shopSettings.clientLanguage} />
                  <DetailRow label="Seuil tampons" value={tenant.shopSettings.stampThreshold} />
                  <DetailRow label="Max scans/jour" value={tenant.shopSettings.maxScansPerDay} />
                  <DetailRow label="Tampons activés" value={tenant.shopSettings.stampsEnabled ? "Oui" : "Non"} />
                  <DetailRow label="Dépenses activées" value={tenant.shopSettings.spendEnabled ? "Oui" : "Non"} />
                  <DetailRow label="Seuil dépense" value={tenant.shopSettings.spendThresholdDzd != null ? formatDzd(tenant.shopSettings.spendThresholdDzd) : "—"} />
                  <DetailRow label="Email client requis" value={tenant.shopSettings.collectClientEmail ? "Oui" : "Non"} />
                  <DetailRow label="Suivi produits" value={tenant.shopSettings.trackProducts ? "Oui" : "Non"} />
                  <DetailRow label="Design carte" value={tenant.shopSettings.cardDesignId} />
                  <DetailRow label="Couleur primaire" value={tenant.shopSettings.primaryColor} />
                  <DetailRow label="Récompense" value={tenant.shopSettings.rewardType} />
                  <DetailRow label="Valeur récompense" value={tenant.shopSettings.rewardValue} />
                  <DetailRow label="WhatsApp" value={tenant.shopSettings.whatsappConfigured ? "Configuré" : "—"} />
                  <DetailRow label="Email campagnes" value={tenant.shopSettings.emailConfigured ? "Configuré" : "—"} />
                </>
              ) : (
                <p className="plat-empty">Paramètres non initialisés.</p>
              )}
            </PlatformCardBody>
          </PlatformCard>

          <PlatformCard>
            <PlatformCardHeader title={`Produits (${tenant.products?.length ?? 0})`} />
            <PlatformCardBody flush>
              {(tenant.products?.length ?? 0) === 0 ? (
                <p className="plat-empty p-6">Aucun produit.</p>
              ) : (
                <div className="plat-table-wrap max-h-96 overflow-y-auto">
                  <table className="plat-table">
                    <thead>
                      <tr>
                        <th>Nom</th>
                        <th>SKU</th>
                        <th className="text-right">Prix</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenant.products!.map((p) => (
                        <tr key={p.id}>
                          <td className="plat-cell-primary">{p.name}</td>
                          <td className="plat-cell-muted">{p.sku ?? "—"}</td>
                          <td className="text-right">{formatDzd(Number(p.price))}</td>
                          <td>{p.isActive ? "Actif" : "Inactif"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </PlatformCardBody>
          </PlatformCard>

          <PlatformCard className="lg:col-span-2">
            <PlatformCardHeader title={`Campagnes (${tenant.campaigns?.length ?? 0})`} />
            <PlatformCardBody flush>
              {(tenant.campaigns?.length ?? 0) === 0 ? (
                <p className="plat-empty p-6">Aucune campagne.</p>
              ) : (
                <div className="plat-list">
                  {tenant.campaigns!.map((c) => (
                    <div key={c.id} className="plat-list-item">
                      <div>
                        <p className="plat-cell-primary">{c.name}</p>
                        <p className="plat-cell-muted text-sm">{c.channel} · {c.totalSent ?? 0}/{c.totalRecipients ?? 0} envoyés</p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={c.status === "sent" ? "active" : c.status === "failed" ? "rejected" : "pending"} />
                        <p className="plat-cell-muted text-xs mt-1">{fmtDateShort(c.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PlatformCardBody>
          </PlatformCard>
        </div>
      )}

      {show("clients") && <TenantClientsPanel tenantId={tenant.id} totalHint={tenant.clientCount} />}

      {show("activity") && (
        <div className="grid gap-6">
          <TenantScansPanel tenantId={tenant.id} totalHint={tenant.scanCount} />

          <div className="grid gap-6 lg:grid-cols-2">
            <PlatformCard>
              <PlatformCardHeader title={`Scans bloqués (${tenant.fraudScans?.length ?? 0})`} />
              <PlatformCardBody className="space-y-0 max-h-80 overflow-y-auto">
                {(tenant.fraudScans?.length ?? 0) === 0 ? (
                  <p className="plat-empty">Aucun.</p>
                ) : (
                  tenant.fraudScans!.map((s) => (
                    <div key={s.id} className="plat-kv-row items-start">
                      <div>
                        <p className="plat-cell-primary">{s.clientName ?? "—"}</p>
                        <p className="plat-cell-muted text-xs">{s.status} · {s.blockReason ?? "—"}</p>
                      </div>
                      <span className="plat-cell-muted text-xs">{fmtDate(s.scannedAt)}</span>
                    </div>
                  ))
                )}
              </PlatformCardBody>
            </PlatformCard>

            <PlatformCard>
              <PlatformCardHeader title={`Récompenses (${tenant.recentRewards?.length ?? 0})`} />
              <PlatformCardBody className="space-y-0 max-h-80 overflow-y-auto">
                {(tenant.recentRewards?.length ?? 0) === 0 ? (
                  <p className="plat-empty">Aucune.</p>
                ) : (
                  tenant.recentRewards!.map((r) => (
                    <div key={r.id} className="plat-kv-row items-start">
                      <div>
                        <p className="plat-cell-primary">{r.clientName}</p>
                        <p className="plat-cell-muted text-xs">{r.rewardDescription}</p>
                      </div>
                      <span className="plat-cell-muted text-xs">
                        {r.redeemedAt ? `Utilisée ${fmtDateShort(r.redeemedAt)}` : "En attente"}
                      </span>
                    </div>
                  ))
                )}
              </PlatformCardBody>
            </PlatformCard>
          </div>
        </div>
      )}

      {show("billing") && (
        <div className="grid gap-6 lg:grid-cols-2">
          <PlatformCard>
            <PlatformCardHeader title="Abonnements" />
            <PlatformCardBody className="space-y-3">
              {tenant.subscriptions.length === 0 ? (
                <p className="plat-empty">Aucun abonnement.</p>
              ) : (
                tenant.subscriptions.map((s) => (
                  <div key={s.id} className="plat-meta-box">
                    <div className="flex justify-between gap-2 items-start">
                      <span className="plat-cell-primary">{planName(s.planId)} · {s.billingPeriod}</span>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={s.status} />
                        <PlatformButton size="sm" variant="danger" className="!px-2" onClick={() => setDeleteSubscriptionId(s.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </PlatformButton>
                      </div>
                    </div>
                    <p className="plat-cell-muted mt-1">{formatDzd(s.amountDzd)}</p>
                    <p className="plat-cell-muted text-xs mt-1">
                      {s.startsAt ? fmtDateShort(s.startsAt) : "—"} → {s.endsAt ? fmtDateShort(s.endsAt) : "—"}
                    </p>
                    {s.chargilyPaymentId && <p className="plat-cell-mono plat-cell-muted text-xs mt-1">Paiement: {s.chargilyPaymentId}</p>}
                    {s.chargilyCheckoutId && <p className="plat-cell-mono plat-cell-muted text-xs">Checkout: {s.chargilyCheckoutId}</p>}
                  </div>
                ))
              )}
            </PlatformCardBody>
          </PlatformCard>

          <PlatformCard>
            <PlatformCardHeader title="Reçus de paiement" />
            <PlatformCardBody className="space-y-3">
              {tenant.receipts.length === 0 ? (
                <p className="plat-empty">Aucun reçu.</p>
              ) : (
                tenant.receipts.map((r) => (
                  <div key={r.id} className="plat-meta-box">
                    <div className="flex justify-between items-start gap-2">
                      <span className="plat-cell-primary">{formatDzd(r.amountDzd)} · {planName(r.planId)}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="plat-cell-muted text-xs mt-1">{r.paymentMethod} · {r.billingPeriod ?? "—"} · {fmtDate(r.createdAt)}</p>
                    {r.reviewerNotes && <p className="text-xs mt-1 opacity-70">{r.reviewerNotes}</p>}
                    {r.receiptUrl && (
                      <a href={r.receiptUrl} target="_blank" rel="noreferrer" className="plat-link text-xs mt-1 inline-block">
                        Voir le reçu
                      </a>
                    )}
                  </div>
                ))
              )}
            </PlatformCardBody>
          </PlatformCard>

          {(tenant.salesCommissions?.length ?? 0) > 0 && (
            <PlatformCard>
              <PlatformCardHeader title="Commissions commerciales" />
              <PlatformCardBody className="space-y-0">
                {tenant.salesCommissions!.map((c) => (
                  <div key={c.id} className="plat-kv-row">
                    <div>
                      <p className="plat-cell-primary">{c.repName}</p>
                      <p className="plat-cell-muted text-xs">{planName(c.planId)} · {c.commissionRate}%</p>
                    </div>
                    <div className="text-right">
                      <p className="plat-cell-primary">{formatDzd(c.commissionDzd)}</p>
                      <StatusBadge status={c.status === "paid" ? "active" : c.status === "approved" ? "pending" : "pending"} />
                    </div>
                  </div>
                ))}
              </PlatformCardBody>
            </PlatformCard>
          )}

          {(tenant.affiliateCommissions?.length ?? 0) > 0 && (
            <PlatformCard>
              <PlatformCardHeader title="Commissions affilié" />
              <PlatformCardBody className="space-y-0">
                {tenant.affiliateCommissions!.map((c) => (
                  <div key={c.id} className="plat-kv-row">
                    <div>
                      <p className="plat-cell-primary">{c.affiliateName} ({c.affiliateCode})</p>
                      <p className="plat-cell-muted text-xs">Période {c.paymentPeriod}/3 · {planName(c.planId)}</p>
                    </div>
                    <div className="text-right">
                      <p className="plat-cell-primary">{formatDzd(c.commissionDzd)}</p>
                      <StatusBadge status={c.status === "paid" ? "active" : "pending"} />
                    </div>
                  </div>
                ))}
              </PlatformCardBody>
            </PlatformCard>
          )}
        </div>
      )}

      <TenantClientQrDialog tenant={tenant} open={qrOpen} onOpenChange={setQrOpen} />
      <TenantDeleteDialog tenant={tenant} open={deleteOpen} onOpenChange={setDeleteOpen} onDeleted={() => setLocation("/businesses")} />
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
