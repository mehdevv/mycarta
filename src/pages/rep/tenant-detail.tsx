import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { useSalesPipeline, useUpsertSalesFollowUp } from "@/api/sales";
import {
  PlatformPageHeader,
  PlatformCard,
  PlatformCardHeader,
  PlatformCardBody,
  PlatformButton,
  PlatformSkeleton,
  StatusBadge,
} from "@/components/platform/platform-ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatDzd, PLANS } from "@/lib/pricing";
import { ArrowLeft, CalendarClock, Coins, QrCode, Users } from "lucide-react";
import { PlatformKpi } from "@/components/platform/platform-ui";

const STATUSES = ["new", "contacted", "negotiating", "won", "lost", "renewed"] as const;
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export default function RepTenantDetailPage() {
  const params = useParams<{ id: string }>();
  const tenantId = params.id;
  const { data: pipeline = [], isLoading } = useSalesPipeline();
  const upsert = useUpsertSalesFollowUp();
  const { toast } = useToast();

  const tenant = pipeline.find((p) => p.tenant_id === tenantId);

  const [status, setStatus] = useState("new");
  const [priority, setPriority] = useState("normal");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [notes, setNotes] = useState("");
  const [upsellPlanId, setUpsellPlanId] = useState<string>("");

  useEffect(() => {
    if (!tenant) return;
    setStatus(tenant.status);
    setPriority(tenant.priority);
    setNotes(tenant.notes ?? "");
    setUpsellPlanId(tenant.upsell_plan_id ?? "");
    setNextFollowUp(
      tenant.next_follow_up_at
        ? new Date(tenant.next_follow_up_at).toISOString().slice(0, 16)
        : "",
    );
  }, [tenant]);

  if (isLoading) {
    return <PlatformSkeleton className="h-64" />;
  }

  if (!tenant) {
    return (
      <div className="plat-stack text-center py-16">
        <p className="plat-cell-muted">Commerce introuvable ou non assigné.</p>
        <Link href="/">
          <PlatformButton variant="secondary" className="mt-4">Retour pipeline</PlatformButton>
        </Link>
      </div>
    );
  }

  const planName = PLANS.find((p) => p.id === tenant.active_sub_plan_id)?.name
    ?? PLANS.find((p) => p.id === tenant.plan_id)?.name
    ?? tenant.plan_id;
  const daysLeft = tenant.days_left;

  const save = async (markContacted = false) => {
    try {
      await upsert.mutateAsync({
        tenantId: tenant.tenant_id,
        status,
        priority,
        notes,
        upsellPlanId: upsellPlanId || null,
        nextFollowUpAt: nextFollowUp ? new Date(nextFollowUp).toISOString() : null,
        markContacted,
      });
      toast({ title: markContacted ? "Contact enregistré" : "Suivi mis à jour" });
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Échec",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="plat-stack">
      <Link href="/">
        <PlatformButton variant="secondary" size="sm" className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Pipeline
        </PlatformButton>
      </Link>

      <PlatformPageHeader
        title={tenant.business_name}
        description={
          <>
            {tenant.slug} · {planName} · <StatusBadge status={tenant.subscription_status} />
          </>
        }
      />

      <div className="plat-stat-grid">
        <PlatformKpi
          title={tenant.access_type === "trial" ? "Jours essai restants" : "Jours abo restants"}
          value={daysLeft ?? "—"}
          icon={CalendarClock}
          accent={daysLeft != null && daysLeft <= 7 ? "amber" : "secondary"}
        />
        <PlatformKpi title="Clients" value={tenant.client_count} subtitle={`+${tenant.new_clients_7d} cette semaine`} icon={Users} />
        <PlatformKpi title="Scans 7j" value={tenant.scans_7d} subtitle={`${tenant.scans_today} aujourd'hui`} icon={QrCode} accent="primary" />
        <PlatformKpi
          title="Commission"
          value={tenant.pending_commission_dzd > 0 ? formatDzd(tenant.pending_commission_dzd) : "—"}
          subtitle={tenant.active_sub_amount_dzd ? formatDzd(tenant.active_sub_amount_dzd) + " / période" : undefined}
          icon={Coins}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PlatformCard>
          <PlatformCardHeader title="Abonnement" />
          <PlatformCardBody className="space-y-2 text-sm">
            <p><span className="plat-cell-muted">Plan :</span> {planName}</p>
            <p><span className="plat-cell-muted">Statut :</span> {tenant.subscription_status}</p>
            {tenant.active_sub_billing_period && (
              <p><span className="plat-cell-muted">Période :</span> {tenant.active_sub_billing_period === "annual" ? "Annuel" : "Mensuel"}</p>
            )}
            {tenant.access_ends_at && (
              <p>
                <span className="plat-cell-muted">{tenant.access_type === "trial" ? "Fin essai" : "Fin abonnement"} :</span>{" "}
                {new Date(tenant.access_ends_at).toLocaleDateString("fr-DZ")}
                {daysLeft != null ? ` (${daysLeft}j)` : ""}
              </p>
            )}
            {tenant.active_sub_starts_at && (
              <p><span className="plat-cell-muted">Début :</span> {new Date(tenant.active_sub_starts_at).toLocaleDateString("fr-DZ")}</p>
            )}
            <p><span className="plat-cell-muted">Workers :</span> {tenant.worker_count}</p>
            <p><span className="plat-cell-muted">Onboarding :</span> {tenant.onboarding_complete ? "Terminé" : "En cours"}</p>
            <p><span className="plat-cell-muted">Inscrit le :</span> {new Date(tenant.tenant_created_at).toLocaleDateString("fr-DZ")}</p>
            {tenant.last_scan_at && (
              <p><span className="plat-cell-muted">Dernier scan :</span> {new Date(tenant.last_scan_at).toLocaleString("fr-DZ")}</p>
            )}
          </PlatformCardBody>
        </PlatformCard>

        <PlatformCard>
          <PlatformCardHeader title="Contact" />
          <PlatformCardBody className="space-y-2 text-sm">
            <p><span className="plat-cell-muted">Propriétaire :</span> {tenant.owner_name ?? "—"}</p>
            <p><span className="plat-cell-muted">Email :</span> {tenant.billing_email ?? tenant.owner_email ?? "—"}</p>
            <p><span className="plat-cell-muted">Téléphone :</span> {tenant.billing_phone ?? tenant.owner_phone ?? tenant.owner_profile_phone ?? "—"}</p>
          </PlatformCardBody>
        </PlatformCard>

        <PlatformCard className="lg:col-span-2">
          <PlatformCardHeader title="Suivi commercial" />
          <PlatformCardBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="plat-label">Statut</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="plat-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="plat-label">Priorité</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="plat-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="plat-label" htmlFor="next-follow-up">Prochain suivi</label>
              <input
                id="next-follow-up"
                type="datetime-local"
                className="plat-input"
                value={nextFollowUp}
                onChange={(e) => setNextFollowUp(e.target.value)}
              />
            </div>

            <div>
              <label className="plat-label">Plan upsell</label>
              <Select value={upsellPlanId || "none"} onValueChange={(v) => setUpsellPlanId(v === "none" ? "" : v)}>
                <SelectTrigger className="plat-select"><SelectValue placeholder="Aucun" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  <SelectItem value="boutique">Boutique</SelectItem>
                  <SelectItem value="maison">Maison</SelectItem>
                  <SelectItem value="prestige">Prestige</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="plat-label" htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                className="plat-input plat-textarea"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="plat-toolbar">
              <PlatformButton onClick={() => void save(false)} disabled={upsert.isPending}>
                Enregistrer
              </PlatformButton>
              <PlatformButton variant="secondary" onClick={() => void save(true)} disabled={upsert.isPending}>
                Marquer contacté
              </PlatformButton>
            </div>
          </PlatformCardBody>
        </PlatformCard>
      </div>
    </div>
  );
}
