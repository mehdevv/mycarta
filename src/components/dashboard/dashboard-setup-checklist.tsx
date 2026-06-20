import { useMemo } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Circle,
  ChevronRight,
  ListChecks,
} from "lucide-react";
import type { AnalyticsOverview } from "@/api/types";
import { useCurrentTenant } from "@/lib/tenant-context";
import { useShopBranding } from "@/hooks/use-branding";
import { useDashboardTour } from "@/lib/dashboard-tour-context";
import { PLATFORM } from "@/lib/platform";
import { staggerItem } from "@/lib/motion";

type ChecklistItem = {
  id: string;
  label: string;
  description: string;
  done: boolean;
  href?: string;
  action?: () => void;
  cta: string;
};

type DashboardSetupChecklistProps = {
  analytics: AnalyticsOverview;
};

export default function DashboardSetupChecklist({ analytics }: DashboardSetupChecklistProps) {
  const { tenant, onboardingComplete, dashboardTutorialComplete } = useCurrentTenant();
  const branding = useShopBranding();
  const { startTour } = useDashboardTour();

  const cardCustomized =
    Boolean(branding.logoUrl || branding.cardTemplateUrl) ||
    branding.primaryColor.toLowerCase() !== PLATFORM.primaryColor.toLowerCase();

  const hasScans =
    analytics.scansThisWeek > 0 ||
    analytics.dailyScans.some((d) => d.count > 0);

  const hasPaidPlan =
    tenant?.planId !== "trial" ||
    tenant?.subscriptionStatus === "active";

  const items: ChecklistItem[] = useMemo(
    () => [
      {
        id: "onboarding",
        label: "Activer votre boutique",
        description: "Configurer le nom, le logo et les couleurs.",
        done: onboardingComplete,
        href: "/onboarding",
        cta: "Configurer",
      },
      {
        id: "card",
        label: "Personnaliser la carte fidélité",
        description: "Logo, couleurs, tampons et récompenses.",
        done: cardCustomized,
        href: "/ccard",
        cta: "Éditer la carte",
      },
      {
        id: "worker",
        label: "Ajouter un employé",
        description: "Pour scanner les achats au comptoir.",
        done: analytics.activeWorkers > 0,
        href: "/workers",
        cta: "Ajouter",
      },
      {
        id: "qr",
        label: "Obtenir votre premier client",
        description: "Partagez le QR ou le lien d'inscription.",
        done: analytics.totalClients > 0,
        href: "/",
        cta: "Voir le QR",
      },
      {
        id: "scan",
        label: "Effectuer un premier scan",
        description: "Validez un achat avec l'app employé.",
        done: hasScans,
        href: "/workers",
        cta: "Voir employés",
      },
      {
        id: "tour",
        label: "Découvrir le tableau de bord",
        description: "Visite guidée des sections principales.",
        done: dashboardTutorialComplete,
        action: () => startTour(),
        cta: "Lancer le tutoriel",
      },
      {
        id: "plan",
        label: "Choisir un forfait",
        description: "Débloquez WhatsApp, campagnes et plus.",
        done: hasPaidPlan,
        href: "/billing",
        cta: "Voir les forfaits",
      },
    ],
    [
      onboardingComplete,
      cardCustomized,
      analytics.activeWorkers,
      analytics.totalClients,
      hasScans,
      dashboardTutorialComplete,
      hasPaidPlan,
      startTour,
    ],
  );

  const completed = items.filter((i) => i.done).length;
  const total = items.length;
  const pendingItems = items.filter((i) => !i.done);
  const progress = Math.round((completed / total) * 100);

  if (pendingItems.length === 0) {
    return null;
  }

  return (
    <motion.article className="dash-card dash-checklist" variants={staggerItem}>
      <div className="dash-card-header dash-checklist-header">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="dash-qr-hub-icon">
            <ListChecks className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="dash-card-title">Checklist de démarrage</h2>
            <p className="dash-section-desc">
              {pendingItems.length} étape{pendingItems.length !== 1 ? "s" : ""} restante
              {pendingItems.length !== 1 ? "s" : ""} · {completed} sur {total} complétée{completed !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="dash-card-body dash-checklist-body">
        <div className="dash-checklist-progress-wrap">
          <div className="dash-checklist-progress" aria-hidden>
            <div className="dash-checklist-progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <p className="dash-checklist-progress-label">{progress}% complété</p>
        </div>

        <ul className="dash-checklist-list">
          {pendingItems.map((item) => (
            <li key={item.id}>
              <div className="dash-checklist-item-icon">
                <Circle className="h-5 w-5 text-[var(--dash-text-secondary)] opacity-50" />
              </div>
              <div className="dash-checklist-item-body min-w-0">
                <p className="dash-checklist-item-label">{item.label}</p>
                <p className="dash-checklist-item-desc">{item.description}</p>
              </div>
              <div className="dash-checklist-item-action shrink-0">
                {item.href ? (
                  <Link href={item.href} className="dash-checklist-cta">
                    {item.cta}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <button type="button" className="dash-checklist-cta" onClick={item.action}>
                    {item.cta}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </motion.article>
  );
}
