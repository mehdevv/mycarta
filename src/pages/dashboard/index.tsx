import { useMemo } from "react";
import { useLocation } from "wouter";
import { Users, QrCode, Gift, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import { useGetAnalyticsOverview } from "@/api";
import type { AnalyticsOverview } from "@/api/types";
import { useCurrentTenant } from "@/lib/tenant-context";
import { useShopBranding } from "@/hooks/use-branding";
import { PLATFORM } from "@/lib/platform";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardTutorialButton } from "@/components/dashboard/dashboard-tutorial-button";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import DashboardQrHub from "@/components/dashboard/dashboard-qr-hub";
import DashboardSetupChecklist from "@/components/dashboard/dashboard-setup-checklist";
import DashboardDiscoverCtas from "@/components/dashboard/dashboard-discover-ctas";
import { DashboardVideoTutorialChip } from "@/components/dashboard/dashboard-video-tutorial";
import { staggerContainer, staggerItem } from "@/lib/motion";

function useHasPendingSetup(analytics: AnalyticsOverview | undefined) {
  const { onboardingComplete, dashboardTutorialComplete, tenant } = useCurrentTenant();
  const branding = useShopBranding();

  return useMemo(() => {
    if (!analytics) return false;

    const cardCustomized =
      Boolean(branding.logoUrl || branding.cardTemplateUrl) ||
      branding.primaryColor.toLowerCase() !== PLATFORM.primaryColor.toLowerCase();
    const hasScans =
      analytics.scansThisWeek > 0 || analytics.dailyScans.some((d) => d.count > 0);
    const hasPaidPlan = tenant?.planId !== "trial" || tenant?.subscriptionStatus === "active";

    const steps = [
      !onboardingComplete,
      !cardCustomized,
      analytics.activeWorkers <= 0,
      analytics.totalClients <= 0,
      !hasScans,
      !dashboardTutorialComplete,
      !hasPaidPlan,
    ];

    return steps.some(Boolean);
  }, [
    analytics,
    branding.cardTemplateUrl,
    branding.logoUrl,
    branding.primaryColor,
    dashboardTutorialComplete,
    onboardingComplete,
    tenant?.planId,
    tenant?.subscriptionStatus,
  ]);
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="dash-skeleton h-20 w-64" />
      <div className="dash-stat-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dash-skeleton h-28 rounded-2xl" />
        ))}
      </div>
      <div className="dash-overview-hub">
        <div className="dash-skeleton h-72 rounded-2xl" />
        <div className="dash-skeleton h-72 rounded-2xl" />
      </div>
      <div className="dash-cta-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="dash-skeleton h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardOverview() {
  const [, navigate] = useLocation();
  const { data: analytics, isLoading } = useGetAnalyticsOverview();
  const hasPendingSetup = useHasPendingSetup(analytics);

  if (isLoading) return <OverviewSkeleton />;
  if (!analytics) return null;

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      <DashboardPageHeader
        eyebrow="Vue d'ensemble"
        title="Tableau de bord"
        description={
          hasPendingSetup
            ? "Statistiques en un coup d'œil, puis checklist, QR et accès rapides."
            : "Statistiques en un coup d'œil, QR et accès rapides."
        }
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <DashboardVideoTutorialChip />
            <DashboardTutorialButton />
          </div>
        }
      />

      {analytics.fraudAlertsToday > 0 && (
        <motion.div className="dash-alert dash-alert--danger" variants={staggerItem}>
            <div className="flex items-start gap-3 flex-1">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
              <p className="font-semibold text-sm">
                {analytics.fraudAlertsToday} alerte{analytics.fraudAlertsToday !== 1 ? "s" : ""} fraude aujourd&apos;hui
                </p>
              <p className="text-sm opacity-80 mt-0.5">Vérifiez les scans bloqués et prenez les mesures nécessaires.</p>
            </div>
          </div>
          <button type="button" className="dash-action-btn dash-action-btn--primary shrink-0" onClick={() => navigate("/fraud")}>
            Voir les alertes
          </button>
        </motion.div>
      )}

      <motion.div className="dash-stat-grid mb-6" variants={staggerItem}>
        <DashboardStatCard
          label="Clients"
          value={analytics.totalClients}
          meta={`+${analytics.newClientsThisWeek} cette semaine`}
          icon={Users}
          accent="brand"
        />
        <DashboardStatCard
          label="Scans aujourd'hui"
          value={analytics.scansToday}
          meta={`${analytics.scansThisWeek} cette semaine`}
          icon={QrCode}
          accent="success"
        />
        <DashboardStatCard
          label="Récompenses en attente"
          value={analytics.rewardsPending}
          meta="À réclamer"
          icon={Gift}
          accent="neutral"
        />
        <DashboardStatCard
          label="Alertes fraude"
          value={analytics.fraudAlertsToday}
          meta="Scans bloqués aujourd'hui"
          icon={ShieldAlert}
          accent="danger"
        />
      </motion.div>

      <motion.div className="dash-overview-hub" variants={staggerItem}>
        <DashboardSetupChecklist analytics={analytics} />
        <DashboardQrHub />
      </motion.div>

      <DashboardDiscoverCtas />
    </motion.div>
  );
}
