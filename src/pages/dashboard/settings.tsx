import SettingsPanel from "@/components/settings/settings-panel";
import SettingsActivityLog from "@/components/settings/settings-activity-log";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { useGetSettings } from "@/api";

export default function Settings() {
  const { isLoading } = useGetSettings();

  if (isLoading) {
    return (
      <div className="dash-settings-page">
        <div className="dash-skeleton h-16 w-64 mb-6" />
        <div className="dash-settings-layout">
          <div className="dash-skeleton h-[520px] rounded-2xl" />
          <div className="dash-skeleton h-[520px] rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="dash-settings-page">
      <DashboardPageHeader
        eyebrow="Configuration"
        title="Paramètres"
        description="Gérez votre compte et votre sécurité."
      />
      <div className="dash-settings-layout">
        <SettingsPanel />
        <SettingsActivityLog />
      </div>
    </div>
  );
}
