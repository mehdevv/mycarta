import { Link } from "wouter";
import { Users, QrCode, TrendingUp, Gift } from "lucide-react";
import { usePlatformOverview, usePlatformAnalytics } from "@/api/platform";
import { formatDzd } from "@/lib/pricing";
import {
  PlatformPageHeader,
  PlatformCard,
  PlatformCardHeader,
  PlatformCardBody,
  PlatformKpi,
  PlatformKpiSkeleton,
  PlatformBanner,
  PlatformSkeleton,
  PLAT_CHART_TOOLTIP,
} from "@/components/platform/platform-ui";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const chartGrid = "rgba(255,255,255,0.06)";
const chartTick = { fill: "#888888", fontSize: 11 };

function TopBarChart({
  data,
  color,
  loading,
}: {
  data: { name: string; value: number }[];
  color: string;
  loading: boolean;
}) {
  if (loading) return <PlatformSkeleton className="h-full w-full min-h-[14rem]" />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} horizontal={false} />
        <XAxis type="number" tick={chartTick} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={100}
          tick={chartTick}
          tickFormatter={(v) => (v.length > 14 ? `${v.slice(0, 14)}…` : v)}
        />
        <Tooltip contentStyle={PLAT_CHART_TOOLTIP} />
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function PlatformAnalyticsPage() {
  const { data: overview, isLoading: overviewLoading } = usePlatformOverview();
  const { data: analytics, isLoading: analyticsLoading, error } = usePlatformAnalytics();
  const isLoading = overviewLoading || analyticsLoading;

  if (error) {
    return (
      <PlatformBanner>
        Exécutez <code>004_platform_analytics_complete.sql</code> dans Supabase.
      </PlatformBanner>
    );
  }

  const topClients = (analytics?.topByClients ?? []).map((t) => ({ name: t.name, value: t.value }));
  const topScans = (analytics?.topByScans ?? []).map((t) => ({ name: t.name, value: t.value }));
  const topGrowth = (analytics?.topByGrowth7d ?? []).map((t) => ({ name: t.name, value: t.value }));
  const topRevenue = (analytics?.topByRevenue ?? []).map((t) => ({ name: t.name, value: t.value }));

  return (
    <div className="plat-stack">
      <PlatformPageHeader title="Analytics" description="Performance agrégée — tops, économie par plan et santé commerces." />

      {isLoading ? (
        <div className="plat-stat-grid">
          {Array(4).fill(0).map((_, i) => (
            <PlatformKpiSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="plat-stat-grid">
          <PlatformKpi title="Clients / commerce" value={overview?.avgClientsPerTenant ?? 0} icon={Users} />
          <PlatformKpi title="Scans / commerce" value={overview?.avgScansPerTenant ?? 0} icon={QrCode} accent="secondary" />
          <PlatformKpi title="Conversion essai→payant" value={`${overview?.trialToPaidRate ?? 0}%`} icon={TrendingUp} accent="amber" />
          <PlatformKpi title="Échange récompenses" value={`${overview?.rewardRedemptionRate ?? 0}%`} icon={Gift} accent="secondary" />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <PlatformCard>
          <PlatformCardHeader title="Top — Clients" />
          <PlatformCardBody><div className="plat-chart h-72"><TopBarChart data={topClients} color="#aaaaaa" loading={isLoading} /></div></PlatformCardBody>
        </PlatformCard>
        <PlatformCard>
          <PlatformCardHeader title="Top — Scans" />
          <PlatformCardBody><div className="plat-chart h-72"><TopBarChart data={topScans} color="#34d399" loading={isLoading} /></div></PlatformCardBody>
        </PlatformCard>
        <PlatformCard>
          <PlatformCardHeader title="Top — Croissance 7j" />
          <PlatformCardBody><div className="plat-chart h-72"><TopBarChart data={topGrowth} color="#888888" loading={isLoading} /></div></PlatformCardBody>
        </PlatformCard>
        <PlatformCard>
          <PlatformCardHeader title="Top — Revenus reçus" />
          <PlatformCardBody><div className="plat-chart h-72"><TopBarChart data={topRevenue} color="#fbbf24" loading={isLoading} /></div></PlatformCardBody>
        </PlatformCard>
      </div>

      <PlatformCard>
        <PlatformCardHeader title="Économie par plan" />
        <PlatformCardBody flush>
          {isLoading ? <PlatformSkeleton className="h-32 m-4" /> : (
            <div className="plat-table-wrap">
              <table className="plat-table">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th className="text-right">Commerces</th>
                    <th className="text-right">Actifs</th>
                    <th className="text-right">Prix/mois</th>
                    <th className="text-right">MRR</th>
                  </tr>
                </thead>
                <tbody>
                  {(analytics?.planEconomics ?? []).map((p) => (
                    <tr key={p.planId}>
                      <td className="plat-cell-primary">{p.planName}</td>
                      <td className="text-right">{p.tenantCount}</td>
                      <td className="text-right">{p.activeCount}</td>
                      <td className="text-right">{p.monthlyPriceDzd != null ? formatDzd(p.monthlyPriceDzd) : "—"}</td>
                      <td className="text-right plat-cell-primary">{formatDzd(p.mrrDzd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PlatformCardBody>
      </PlatformCard>

      <PlatformCard>
        <PlatformCardHeader title="Classement employés (scans)" />
        <PlatformCardBody flush>
          {isLoading ? <PlatformSkeleton className="h-32 m-4" /> : (
            <div className="plat-table-wrap">
              <table className="plat-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Employé</th>
                    <th>Commerce</th>
                    <th className="text-right">Scans</th>
                  </tr>
                </thead>
                <tbody>
                  {(analytics?.workerLeaderboard ?? []).map((w, i) => (
                    <tr key={w.workerId}>
                      <td className="plat-cell-muted">{i + 1}</td>
                      <td className="plat-cell-primary">{w.workerName}</td>
                      <td>{w.tenantName}</td>
                      <td className="text-right">{w.scanCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PlatformCardBody>
      </PlatformCard>

      <PlatformCard>
        <PlatformCardHeader title="Santé des commerces" />
        <PlatformCardBody flush>
          {isLoading ? <PlatformSkeleton className="h-48 m-4" /> : (
            <div className="plat-table-wrap">
              <table className="plat-table">
                <thead>
                  <tr>
                    <th>Commerce</th>
                    <th className="text-right">Clients</th>
                    <th className="text-right">Scans 30j</th>
                    <th className="text-right">Jours sans scan</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {(analytics?.healthScores ?? []).slice(0, 25).map((h) => (
                    <tr key={h.tenantId}>
                      <td>
                        <Link href={`/businesses/${h.tenantId}`} className="plat-link plat-cell-primary">{h.name}</Link>
                      </td>
                      <td className="text-right">{h.clientCount}</td>
                      <td className="text-right">{h.scanCount30d}</td>
                      <td className={`text-right ${h.daysSinceLastScan != null && h.daysSinceLastScan >= 14 ? "plat-cell-danger" : ""}`}>
                        {h.daysSinceLastScan ?? "—"}
                      </td>
                      <td className="plat-cell-muted">{h.subscriptionStatus}</td>
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
