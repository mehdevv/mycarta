import {
  Activity,
  CreditCard,
  Gift,
  Loader2,
  Package,
  QrCode,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";
import { ACTIVITY_FEED_LIMIT, useListActivities, type TenantActivity } from "@/api";
import { useLocale } from "@/lib/i18n/locale-context";
import type { LucideIcon } from "lucide-react";

const KIND_ICONS: Record<string, LucideIcon> = {
  "client.enrolled": UserPlus,
  "scan.approved": QrCode,
  "scan.fraud": Shield,
  "scan.limit": Shield,
  "reward.earned": Gift,
  "reward.redeemed": Gift,
  "worker.added": Users,
  "worker.deactivated": Users,
  "worker.password_reset": Shield,
  "product.added": Package,
  "product.updated": Package,
  "product.removed": Package,
  "payment.submitted": CreditCard,
  "subscription.created": CreditCard,
  "security.password_changed": Shield,
  "settings.branding_updated": Activity,
};

function formatWhen(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

function activityLabel(
  activity: TenantActivity,
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  const meta = activity.metadata;
  const clientName = String(meta.clientName ?? activity.detail ?? "");
  const workerName = String(meta.workerName ?? activity.actorName ?? "");
  const productName = String(meta.productName ?? activity.detail ?? "");
  const rewardDescription = String(meta.rewardDescription ?? "");
  const stampsAdded = meta.stampsAdded != null ? String(meta.stampsAdded) : "";

  switch (activity.kind) {
    case "client.enrolled":
      return t("dashboard.settings.activities.clientEnrolled", { name: clientName || "—" });
    case "scan.approved":
      return t("dashboard.settings.activities.scanApproved", {
        client: clientName || "—",
        stamps: stampsAdded || "0",
      });
    case "scan.fraud":
      return t("dashboard.settings.activities.scanFraud", { client: clientName || "—" });
    case "scan.limit":
      return t("dashboard.settings.activities.scanLimit", { client: clientName || "—" });
    case "reward.earned":
      return t("dashboard.settings.activities.rewardEarned", {
        client: clientName || "—",
        reward: rewardDescription || "—",
      });
    case "reward.redeemed":
      return t("dashboard.settings.activities.rewardRedeemed", {
        client: clientName || "—",
        worker: workerName || "—",
      });
    case "worker.added":
      return t("dashboard.settings.activities.workerAdded", {
        name: String(meta.workerName ?? activity.detail ?? "—"),
      });
    case "worker.deactivated":
      return t("dashboard.settings.activities.workerDeactivated", {
        name: String(meta.workerName ?? activity.detail ?? "—"),
      });
    case "worker.password_reset":
      return t("dashboard.settings.activities.workerPasswordReset", {
        name: String(meta.workerName ?? activity.detail ?? "—"),
      });
    case "product.added":
      return t("dashboard.settings.activities.productAdded", { name: productName || "—" });
    case "product.updated":
      return t("dashboard.settings.activities.productUpdated", { name: productName || "—" });
    case "product.removed":
      return t("dashboard.settings.activities.productRemoved", { name: productName || "—" });
    case "payment.submitted":
      return t("dashboard.settings.activities.paymentSubmitted", {
        amount: String(meta.amountDzd ?? activity.detail ?? "—"),
      });
    case "subscription.created":
      return t("dashboard.settings.activities.subscriptionCreated", {
        plan: String(meta.planId ?? activity.detail ?? "—"),
      });
    case "security.password_changed":
      return t("dashboard.settings.activities.passwordChanged");
    case "settings.branding_updated":
      return t("dashboard.settings.activities.brandingUpdated");
    default:
      return activity.detail || activity.kind;
  }
}

function activityActor(
  activity: TenantActivity,
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  if (!activity.actorName) return null;
  if (activity.kind.startsWith("scan.") || activity.kind === "reward.redeemed") {
    return t("dashboard.settings.activities.byWorker", { name: activity.actorName });
  }
  if (activity.kind.startsWith("worker.") || activity.kind === "security.password_changed") {
    return t("dashboard.settings.activities.byOwner", { name: activity.actorName });
  }
  return activity.actorName;
}

export default function SettingsActivityLog() {
  const { t, locale } = useLocale();
  const { data, isLoading, refetch, isRefetching } = useListActivities(ACTIVITY_FEED_LIMIT);

  const activities = data?.activities ?? [];

  return (
    <article className="dash-card dash-settings-activity-card">
      <div className="dash-settings-activity-card-head">
        <div>
          <h2 className="dash-settings-block-title">{t("dashboard.settings.activities.title")}</h2>
          <p className="dash-settings-block-desc">{t("dashboard.settings.activities.desc")}</p>
        </div>
        <button
          type="button"
          className="dash-settings-activity-refresh"
          onClick={() => void refetch()}
          disabled={isRefetching}
        >
          {isRefetching ? <Loader2 className="h-4 w-4 animate-spin" /> : t("dashboard.settings.activities.refresh")}
        </button>
      </div>

      <div className="dash-settings-activity-list">
        {isLoading ? (
          <div className="dash-settings-activity-empty">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : activities.length === 0 ? (
          <p className="dash-settings-activity-empty">{t("dashboard.settings.activities.empty")}</p>
        ) : (
          activities.map((activity) => {
            const Icon = KIND_ICONS[activity.kind] ?? Activity;
            const actor = activityActor(activity, t);
            return (
              <div key={activity.id} className="dash-settings-activity-item">
                <span className="dash-settings-activity-icon" aria-hidden>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="dash-settings-activity-body">
                  <p className="dash-settings-activity-label">{activityLabel(activity, t)}</p>
                  <p className="dash-settings-activity-meta">
                    {formatWhen(activity.occurredAt, locale)}
                    {actor ? ` · ${actor}` : ""}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}
