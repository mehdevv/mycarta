import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useSalesPipeline, useUpsertSalesFollowUp } from "@/api/sales";
import type { PipelineItem } from "@/api/sales";
import {
  PlatformPageHeader,
  PlatformButton,
  PlatformKpi,
  PlatformKpiSkeleton,
  PlatformSkeleton,
  PlatformTabs,
} from "@/components/platform/platform-ui";
import { formatDzd, PLANS } from "@/lib/pricing";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  CalendarClock,
  ChevronRight,
  Clock,
  Coins,
  Mail,
  Phone,
  QrCode,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  negotiating: "Négociation",
  won: "Gagné",
  lost: "Perdu",
  renewed: "Renouvelé",
};

const SUB_STATUS_LABELS: Record<string, string> = {
  trialing: "Essai",
  active: "Actif",
  past_due: "En retard",
  canceled: "Annulé",
  expired: "Expiré",
};

type Filter = "all" | "active" | "trial" | "urgent" | "week";

function daysLeft(item: PipelineItem) {
  return item.days_left ?? item.urgency_days ?? null;
}

function isUrgent(item: PipelineItem) {
  const left = daysLeft(item);
  if (left != null && left <= 7) return true;
  return item.access_type === "trial" && item.plan_id === "trial";
}

function accessLabel(item: PipelineItem) {
  if (item.access_type === "trial") return "Essai gratuit";
  if (item.active_sub_billing_period === "annual") return "Abonnement annuel";
  if (item.active_sub_billing_period === "monthly") return "Abonnement mensuel";
  if (item.subscription_status === "active") return "Abonnement actif";
  return SUB_STATUS_LABELS[item.subscription_status] ?? item.subscription_status;
}

function planName(id: string) {
  return PLANS.find((p) => p.id === id)?.name ?? id;
}

function barTotalDays(item: PipelineItem) {
  if (item.access_type === "trial") return 14;
  if (item.active_sub_billing_period === "annual") return 365;
  if (item.active_sub_billing_period === "monthly") return 30;
  return 30;
}

function barPercent(item: PipelineItem) {
  const left = daysLeft(item);
  if (left == null) return 0;
  const total = barTotalDays(item);
  return Math.min(100, Math.max(4, (left / total) * 100));
}

function barTone(item: PipelineItem): "ok" | "warn" | "danger" {
  const left = daysLeft(item);
  if (left == null) return "ok";
  if (left <= 3) return "danger";
  if (left <= 7) return "warn";
  return "ok";
}

function formatRelativeDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Hier";
  if (diff < 7) return `Il y a ${diff}j`;
  return d.toLocaleDateString("fr-DZ", { day: "numeric", month: "short" });
}

function RepTenantCard({
  item,
  onMarkContacted,
  marking,
}: {
  item: PipelineItem;
  onMarkContacted: (tenantId: string) => void;
  marking: boolean;
}) {
  const left = daysLeft(item);
  const urgent = isUrgent(item);
  const critical = left != null && left <= 3;
  const contactPhone = item.billing_phone ?? item.owner_phone ?? item.owner_profile_phone;
  const contactEmail = item.billing_email ?? item.owner_email;
  const displayPlan = item.access_type === "paid" ? item.active_sub_plan_id : item.plan_id;
  const tone = barTone(item);

  return (
    <article
      className={cn(
        "rep-tenant-card",
        urgent && "rep-tenant-card--urgent",
        critical && "rep-tenant-card--critical",
      )}
    >
      <div className="rep-tenant-card__top">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={cn("rep-chip", item.access_type === "trial" ? "rep-chip--trial" : "rep-chip--paid")}>
              {accessLabel(item)}
            </span>
            <span className="rep-chip rep-chip--follow">{STATUS_LABELS[item.status] ?? item.status}</span>
            {item.priority === "urgent" || item.priority === "high" ? (
              <span className="rep-chip">{item.priority}</span>
            ) : null}
          </div>
          <Link
            href={`/tenant/${item.tenant_id}`}
            className="plat-cell-primary text-lg font-semibold hover:underline inline-flex items-center gap-1"
          >
            {item.business_name}
            <ChevronRight size={16} className="opacity-50" />
          </Link>
          <p className="plat-cell-muted text-sm mt-0.5">
            {item.slug} · {planName(displayPlan)}
            {item.active_sub_amount_dzd ? ` · ${formatDzd(item.active_sub_amount_dzd)}` : ""}
          </p>
        </div>

        {left != null && (
          <div className="text-right shrink-0">
            <p className={cn("text-2xl font-bold tabular-nums", critical ? "text-red-400" : urgent ? "text-amber-300" : "text-emerald-300")}>
              {left}j
            </p>
            <p className="text-xs plat-cell-muted">restants</p>
          </div>
        )}
      </div>

      <div className="rep-tenant-card__sub">
        {item.access_ends_at && (
          <div className="rep-access-bar">
            <div className="rep-access-bar__meta">
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock size={14} />
                {item.access_type === "trial" ? "Fin essai" : "Fin abonnement"}
                {" · "}
                {new Date(item.access_ends_at).toLocaleDateString("fr-DZ", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              {item.onboarding_complete ? (
                <span className="text-emerald-400/90 text-xs">Onboarding ✓</span>
              ) : (
                <span className="text-amber-300/90 text-xs">Onboarding en cours</span>
              )}
            </div>
            <div className="rep-access-bar__track">
              <div
                className={cn("rep-access-bar__fill", `rep-access-bar__fill--${tone}`)}
                style={{ width: `${barPercent(item)}%` }}
              />
            </div>
          </div>
        )}

        <div className="rep-mini-stats">
          <div className="rep-mini-stat">
            <p className="rep-mini-stat__label">Clients</p>
            <p className="rep-mini-stat__value">{item.client_count}</p>
          </div>
          <div className="rep-mini-stat">
            <p className="rep-mini-stat__label">+7 jours</p>
            <p className="rep-mini-stat__value">{item.new_clients_7d}</p>
          </div>
          <div className="rep-mini-stat">
            <p className="rep-mini-stat__label">Scans 7j</p>
            <p className="rep-mini-stat__value">{item.scans_7d}</p>
          </div>
          <div className="rep-mini-stat">
            <p className="rep-mini-stat__label">Workers</p>
            <p className="rep-mini-stat__value">{item.worker_count}</p>
          </div>
        </div>

        <div className="rep-contact-row">
          {item.owner_name && (
            <span className="inline-flex items-center gap-1.5">
              <Building2 size={14} />
              {item.owner_name}
            </span>
          )}
          {contactPhone && (
            <a href={`tel:${contactPhone}`}>
              <Phone size={14} />
              {contactPhone}
            </a>
          )}
          {contactEmail && (
            <a href={`mailto:${contactEmail}`}>
              <Mail size={14} />
              {contactEmail}
            </a>
          )}
          <span className="inline-flex items-center gap-1.5">
            <QrCode size={14} />
            Dernier scan {formatRelativeDate(item.last_scan_at)}
          </span>
          {item.next_follow_up_at && (
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} />
              Suivi {new Date(item.next_follow_up_at).toLocaleDateString("fr-DZ")}
            </span>
          )}
          {item.pending_commission_dzd > 0 && (
            <span className="inline-flex items-center gap-1.5 text-emerald-300/90">
              <Coins size={14} />
              {formatDzd(item.pending_commission_dzd)} commission
            </span>
          )}
        </div>

        {item.notes && (
          <p className="text-sm plat-cell-muted border-t border-white/10 pt-3 leading-relaxed">{item.notes}</p>
        )}
      </div>

      <div className="rep-card-actions">
        <Link href={`/tenant/${item.tenant_id}`}>
          <PlatformButton size="sm">Voir fiche</PlatformButton>
        </Link>
        <PlatformButton
          size="sm"
          variant="secondary"
          disabled={marking}
          onClick={() => onMarkContacted(item.tenant_id)}
        >
          Marquer contacté
        </PlatformButton>
      </div>
    </article>
  );
}

export default function RepPipelinePage() {
  const { data: pipeline = [], isLoading } = useSalesPipeline();
  const upsert = useUpsertSalesFollowUp();
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [markingId, setMarkingId] = useState<string | null>(null);

  const summary = useMemo(() => {
    const active = pipeline.filter((i) => i.access_type === "paid" || i.subscription_status === "active");
    const trials = pipeline.filter((i) => i.access_type === "trial");
    const expiring = pipeline.filter((i) => {
      const left = daysLeft(i);
      return left != null && left <= 7;
    });
    const pendingCommission = pipeline.reduce((sum, i) => sum + (i.pending_commission_dzd ?? 0), 0);
    const followWeek = pipeline.filter((i) => {
      if (!i.next_follow_up_at) return false;
      const next = new Date(i.next_follow_up_at);
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() + 7);
      return next <= weekEnd;
    }).length;

    return { active: active.length, trials: trials.length, expiring: expiring.length, pendingCommission, followWeek };
  }, [pipeline]);

  const filtered = useMemo(() => {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return pipeline.filter((item) => {
      if (filter === "active") return item.access_type === "paid" || item.subscription_status === "active";
      if (filter === "trial") return item.access_type === "trial";
      if (filter === "urgent") return isUrgent(item);
      if (filter === "week") {
        if (!item.next_follow_up_at) return false;
        const next = new Date(item.next_follow_up_at);
        return next >= now && next <= weekEnd;
      }
      return true;
    });
  }, [pipeline, filter]);

  const activeList = filtered.filter((i) => i.access_type === "paid" || (i.subscription_status === "active" && i.access_type !== "trial"));
  const trialList = filtered.filter((i) => i.access_type === "trial");
  const otherList = filtered.filter(
    (i) => !activeList.includes(i) && !trialList.includes(i),
  );

  const handleMarkContacted = async (tenantId: string) => {
    setMarkingId(tenantId);
    try {
      await upsert.mutateAsync({ tenantId, markContacted: true, status: "contacted" });
      toast({ title: "Contact enregistré" });
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Échec",
        variant: "destructive",
      });
    } finally {
      setMarkingId(null);
    }
  };

  const renderList = (items: PipelineItem[], title: string) => {
    if (items.length === 0) return null;
    return (
      <section>
        <h2 className="rep-section-title">{title} ({items.length})</h2>
        <div className="plat-stack">
          {items.map((item) => (
            <RepTenantCard
              key={item.tenant_id}
              item={item}
              onMarkContacted={handleMarkContacted}
              marking={markingId === item.tenant_id}
            />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="plat-stack rep-pipeline-head">
      <PlatformPageHeader
        title="Mes commerces"
        description="Abonnements actifs, jours restants et activité client pour chaque commerce assigné."
      />

      {isLoading ? (
        <div className="rep-stat-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <PlatformKpiSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="rep-stat-grid">
          <PlatformKpi title="Assignés" value={pipeline.length} icon={Building2} />
          <PlatformKpi title="Abos actifs" value={summary.active} subtitle="Paiements en cours" icon={Sparkles} accent="secondary" />
          <PlatformKpi title="Expire ≤ 7j" value={summary.expiring} subtitle={`${summary.trials} essai(x)`} icon={CalendarClock} accent="amber" />
          <PlatformKpi
            title="Commissions"
            value={formatDzd(summary.pendingCommission)}
            subtitle={`${summary.followWeek} suivi(s) cette semaine`}
            icon={Coins}
            accent="primary"
          />
        </div>
      )}

      <PlatformTabs
        value={filter}
        onChange={setFilter}
        items={[
          { value: "all", label: "Tous" },
          { value: "active", label: "Abonnements actifs" },
          { value: "trial", label: "Essais" },
          { value: "urgent", label: "Urgent" },
          { value: "week", label: "Suivis semaine" },
        ]}
      />

      {isLoading ? (
        <div className="plat-stack">
          {Array.from({ length: 3 }).map((_, i) => (
            <PlatformSkeleton key={i} className="h-44" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rep-empty-block">
          <Users size={32} className="mx-auto mb-3 opacity-40" />
          <p>Aucun commerce dans ce filtre.</p>
          <p className="text-sm mt-1">Demandez à l&apos;admin de vous assigner des commerces.</p>
        </div>
      ) : filter === "all" ? (
        <div className="plat-stack">
          {renderList(activeList, "Abonnements actifs")}
          {renderList(trialList, "Essais gratuits")}
          {renderList(otherList, "Autres statuts")}
        </div>
      ) : (
        <div className="plat-stack">
          {filtered.map((item) => (
            <RepTenantCard
              key={item.tenant_id}
              item={item}
              onMarkContacted={handleMarkContacted}
              marking={markingId === item.tenant_id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
