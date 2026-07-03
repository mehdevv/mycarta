import { Link } from "wouter";
import {
  Building2,
  Users,
  QrCode,
  Gift,
  Receipt,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  ShieldAlert,
  UserCog,
  BadgeCheck,
} from "lucide-react";
import { usePlatformOverview, usePlatformTenants, usePlatformAlerts } from "@/api/platform";
import { formatDzd } from "@/lib/pricing";
import {
  PlatformKpi,
  PlatformKpiSkeleton,
  PlatformPageHeader,
  PlatformCard,
  PlatformCardHeader,
  PlatformCardBody,
  StatusBadge,
  PlatformButton,
  PlatformBanner,
  PLAT_CHART_TOOLTIP,
} from "@/components/platform/platform-ui";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const chartGrid = "rgba(255,255,255,0.06)";
const chartTick = { fill: "#888888", fontSize: 11 };

export default function PlatformOverviewPage() {
  const { data: overview, isLoading, error } = usePlatformOverview();
  const { data: tenants = [] } = usePlatformTenants();
  const { data: alerts } = usePlatformAlerts();

  if (error) {
    return (
      <PlatformBanner>
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Migration requise</p>
          <p className="text-sm opacity-80 mt-1">
            Exécutez les migrations <code>004</code> et <code>005</code> dans l&apos;éditeur SQL Supabase.
          </p>
          <p className="text-xs opacity-60 mt-2">{(error as Error).message}</p>
        </div>
      </PlatformBanner>
    );
  }

  const recentTenants = tenants.slice(0, 8);
  const alertCount = alerts?.items?.length ?? 0;

  return (
    <div className="plat-stack">
      <PlatformPageHeader
        title="Vue d'ensemble"
        description="Statistiques globales de la plateforme Carta."
        action={
          <div className="plat-toolbar">
            {alertCount > 0 && (
              <Link href="/alerts">
                <PlatformButton variant="secondary" className="gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {alertCount} alerte(s)
                </PlatformButton>
              </Link>
            )}
            {overview && overview.pendingReceipts > 0 && (
              <Link href="/payments">
                <PlatformButton variant="warning" className="gap-2">
                  <Receipt className="h-4 w-4" />
                  {overview.pendingReceipts} reçu(s)
                </PlatformButton>
              </Link>
            )}
          </div>
        }
      />

      {isLoading ? (
        <div className="plat-stat-grid">
          {Array(12).fill(0).map((_, i) => (
            <PlatformKpiSkeleton key={i} />
          ))}
        </div>
      ) : overview ? (
        <>
          <div className="plat-stat-grid">
            <PlatformKpi title="Commerces" value={overview.totalTenants} subtitle={`${overview.activeTenants} actifs · ${overview.trialingTenants} essai`} icon={Building2} />
            <PlatformKpi title="MRR estimé" value={formatDzd(overview.estimatedMrrDzd)} subtitle={`ARR ${formatDzd(overview.estimatedArrDzd ?? 0)}`} icon={TrendingUp} accent="amber" />
            <PlatformKpi title="Revenus encaissés" value={formatDzd(overview.revenueApprovedTotalDzd ?? 0)} subtitle={`${formatDzd(overview.revenueApprovedThisMonthDzd ?? 0)} ce mois`} icon={CreditCard} accent="secondary" />
            <PlatformKpi title="Essais J-7" value={overview.trialExpiring7d ?? 0} subtitle="Expirent sous 7 jours" icon={AlertTriangle} accent="destructive" />
            <PlatformKpi title="Clients / cartes" value={overview.totalClients.toLocaleString("fr-DZ")} subtitle={`${overview.activeCards ?? 0} actives · ${overview.blockedCards ?? 0} bloquées`} icon={Users} accent="secondary" />
            <PlatformKpi title="Inscriptions cartes" value={overview.clientsEnrolledThisWeek ?? 0} subtitle={`${overview.clientsEnrolledToday ?? 0} aujourd'hui`} icon={BadgeCheck} />
            <PlatformKpi title="Scans aujourd'hui" value={overview.scansToday} subtitle={`${overview.scansThisWeek} cette semaine`} icon={QrCode} />
            <PlatformKpi title="Fraude" value={overview.fraudScansToday ?? 0} subtitle={`${overview.fraudRate ?? 0}% taux global`} icon={ShieldAlert} accent="destructive" />
            <PlatformKpi title="Employés actifs" value={overview.activeWorkers ?? 0} subtitle={`${overview.avgWorkersPerTenant ?? 0} / commerce`} icon={UserCog} />
            <PlatformKpi title="Récompenses" value={overview.totalRewards} subtitle={`${overview.rewardRedemptionRate ?? 0}% échangées`} icon={Gift} accent="secondary" />
            <PlatformKpi title="Conversion essai→payant" value={`${overview.trialToPaidRate ?? 0}%`} subtitle={`Onboarding ${overview.onboardingRate ?? 0}%`} icon={TrendingUp} accent="amber" />
            <PlatformKpi title="Churn ce mois" value={overview.monthlyChurnCount ?? 0} subtitle={`${overview.expiredTenants} expirés total`} icon={AlertTriangle} accent="destructive" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <PlatformCard>
              <PlatformCardHeader title="Inscriptions commerces (30j)" />
              <PlatformCardBody>
                <div className="plat-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overview.signupsByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                      <XAxis dataKey="date" tick={chartTick} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={chartTick} allowDecimals={false} />
                      <Tooltip contentStyle={PLAT_CHART_TOOLTIP} />
                      <Bar dataKey="count" fill="#aaaaaa" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </PlatformCardBody>
            </PlatformCard>
            <PlatformCard>
              <PlatformCardHeader title="Nouvelles cartes (30j)" />
              <PlatformCardBody>
                <div className="plat-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={overview.enrolmentsByDay ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                      <XAxis dataKey="date" tick={chartTick} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={chartTick} allowDecimals={false} />
                      <Tooltip contentStyle={PLAT_CHART_TOOLTIP} />
                      <Line type="monotone" dataKey="count" stroke="#34d399" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </PlatformCardBody>
            </PlatformCard>
            <PlatformCard>
              <PlatformCardHeader title="Scans plateforme (30j)" />
              <PlatformCardBody>
                <div className="plat-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={overview.scansByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                      <XAxis dataKey="date" tick={chartTick} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={chartTick} allowDecimals={false} />
                      <Tooltip contentStyle={PLAT_CHART_TOOLTIP} />
                      <Line type="monotone" dataKey="count" stroke="#888888" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </PlatformCardBody>
            </PlatformCard>
            <PlatformCard>
              <PlatformCardHeader title="Revenus reçus (30j)" />
              <PlatformCardBody>
                <div className="plat-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overview.revenueByDay ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                      <XAxis dataKey="date" tick={chartTick} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={chartTick} allowDecimals={false} />
                      <Tooltip contentStyle={PLAT_CHART_TOOLTIP} formatter={(v) => [`${Number(v).toLocaleString("fr-DZ")} DZD`, "Montant"]} />
                      <Bar dataKey="amountDzd" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </PlatformCardBody>
            </PlatformCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <PlatformCard>
              <PlatformCardHeader title="Répartition par plan" />
              <PlatformCardBody>
                <div className="plat-chip-grid">
                  {Object.entries(overview.tenantsByPlan).map(([plan, count]) => (
                    <div key={plan} className="plat-chip">
                      <p className="plat-chip-label">{plan}</p>
                      <p className="plat-chip-value">{count}</p>
                    </div>
                  ))}
                </div>
              </PlatformCardBody>
            </PlatformCard>
            <PlatformCard>
              <PlatformCardHeader title="MRR par plan" />
              <PlatformCardBody className="space-y-3">
                {(overview.mrrByPlan ?? []).length === 0 ? (
                  <p className="plat-empty">Aucun abonnement actif.</p>
                ) : (
                  overview.mrrByPlan!.map((p) => (
                    <div key={p.planId} className="plat-kv-row">
                      <span className="plat-cell-primary">{p.planName}</span>
                      <span>{p.tenantCount} commerces · {formatDzd(p.mrrDzd)}</span>
                    </div>
                  ))
                )}
              </PlatformCardBody>
            </PlatformCard>
          </div>
        </>
      ) : null}

      <PlatformCard>
        <PlatformCardHeader
          title="Commerces récents"
          action={
            <Link href="/businesses">
              <PlatformButton variant="secondary" size="sm">Voir tout</PlatformButton>
            </Link>
          }
        />
        <PlatformCardBody flush>
          {recentTenants.length === 0 ? (
            <p className="plat-empty">Aucun commerce inscrit.</p>
          ) : (
            <div className="plat-table-wrap">
              <table className="plat-table">
                <thead>
                  <tr>
                    <th>Commerce</th>
                    <th>Plan</th>
                    <th>Statut</th>
                    <th className="text-right">Clients</th>
                    <th className="text-right">+7j</th>
                    <th className="text-right">Scans</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTenants.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <Link href={`/businesses/${t.id}`} className="plat-link plat-cell-primary">{t.name}</Link>
                        <p className="plat-cell-mono plat-cell-muted">{t.slug}</p>
                      </td>
                      <td>{t.planName}</td>
                      <td><StatusBadge status={t.subscriptionStatus} /></td>
                      <td className="text-right">{t.clientCount}</td>
                      <td className="text-right plat-cell-success">+{t.newClients7d ?? 0}</td>
                      <td className="text-right">{t.scanCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PlatformCardBody>
      </PlatformCard>
    </div>
  );
}
