import SettingsPanel from "@/components/settings/settings-panel";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { useGetSettings } from "@/api";
import { useState, useEffect } from "react";

export default function Settings() {
  const { data: settings, isLoading } = useGetSettings();

  const [business, setBusiness] = useState({
    currency: "DZD",
    timezone: "Africa/Algiers",
    clientLanguage: "fr" as "fr" | "en",
  });

  useEffect(() => {
    if (settings) {
      setBusiness({
        currency: settings.currency ?? "DZD",
        timezone: settings.timezone ?? "Africa/Algiers",
        clientLanguage: settings.clientLanguage ?? "fr",
      });
    }
  }, [settings]);

  if (isLoading) {
    return (
      <div className="dash-settings-page">
        <div className="dash-skeleton h-16 w-64 mb-6" />
        <div className="dash-skeleton h-[520px] rounded-2xl max-w-3xl" />
      </div>
    );
  }

  return (
    <div className="dash-settings-page">
      <DashboardPageHeader
        eyebrow="Configuration"
        title="Paramètres"
        description="Gérez votre compte, vos préférences commerce et votre sécurité."
      />
      <SettingsPanel business={business} onBusinessChange={setBusiness} />
    </div>
  );
}
