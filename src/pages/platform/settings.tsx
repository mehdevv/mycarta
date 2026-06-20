import { useEffect, useState } from "react";
import { usePlatformSettings, useUpdatePlatformSettings, usePlatformAuditLog } from "@/api/platform";
import {
  PlatformPageHeader,
  PlatformCard,
  PlatformCardHeader,
  PlatformCardBody,
  PlatformButton,
  PlatformSkeleton,
} from "@/components/platform/platform-ui";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { PLATFORM } from "@/lib/platform";

export default function PlatformSettingsPage() {
  const { data: settings, isLoading } = usePlatformSettings();
  const { data: audit = [], isLoading: auditLoading } = usePlatformAuditLog(30);
  const updateSettings = useUpdatePlatformSettings();
  const { toast } = useToast();

  const [bank, setBank] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceBanner, setMaintenanceBanner] = useState("");

  useEffect(() => {
    if (settings) {
      setBank(settings.bank_details ?? "");
      setSupportEmail(settings.support_email ?? "");
      setMaintenanceEnabled(settings.maintenance_enabled ?? false);
      setMaintenanceBanner(settings.maintenance_banner ?? "");
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        bank_details: bank,
        support_email: supportEmail,
        maintenance_enabled: maintenanceEnabled,
        maintenance_banner: maintenanceBanner,
      });
      toast({ title: "Paramètres enregistrés" });
    } catch (e) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Échec", variant: "destructive" });
    }
  };

  return (
    <div className="plat-stack max-w-3xl">
      <PlatformPageHeader title="Paramètres plateforme" description="Configuration globale, maintenance et journal d'audit." />

      <PlatformCard>
        <PlatformCardHeader
          title="Coordonnées bancaires"
          description="Affichées sur la page facturation de chaque commerce."
        />
        <PlatformCardBody className="space-y-4">
          {isLoading ? (
            <PlatformSkeleton className="h-32 w-full" />
          ) : (
            <textarea
              className="plat-input plat-textarea"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              rows={5}
            />
          )}
        </PlatformCardBody>
      </PlatformCard>

      <PlatformCard>
        <PlatformCardHeader title="Support & maintenance" />
        <PlatformCardBody className="space-y-4">
          <div>
            <label className="plat-label" htmlFor="support-email">Email support</label>
            <input
              id="support-email"
              className="plat-input"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
            />
          </div>
          <div className="plat-field-row">
            <div>
              <p className="plat-cell-primary text-sm">Mode maintenance</p>
              <p className="plat-cell-muted text-xs">Affiche une bannière globale (à brancher côté app).</p>
            </div>
            <Switch checked={maintenanceEnabled} onCheckedChange={setMaintenanceEnabled} />
          </div>
          <textarea
            className="plat-input plat-textarea"
            value={maintenanceBanner}
            onChange={(e) => setMaintenanceBanner(e.target.value)}
            placeholder="Message de maintenance…"
            rows={2}
          />
          <PlatformButton onClick={handleSave} disabled={updateSettings.isPending}>Enregistrer</PlatformButton>
        </PlatformCardBody>
      </PlatformCard>

      <PlatformCard>
        <PlatformCardHeader
          title="Identité plateforme"
          description="Variables d'environnement (.env)."
        />
        <PlatformCardBody>
          <div className="plat-kv-row"><span className="plat-cell-muted">Nom</span><span className="plat-cell-primary">{PLATFORM.name}</span></div>
          <div className="plat-kv-row"><span className="plat-cell-muted">Support (.env)</span><span className="plat-cell-primary">{PLATFORM.supportEmail}</span></div>
          <div className="plat-kv-row"><span className="plat-cell-muted">Chargily</span><span className="plat-cell-muted text-xs">Clés via secrets Supabase — non éditables ici</span></div>
        </PlatformCardBody>
      </PlatformCard>

      <PlatformCard>
        <PlatformCardHeader
          title="Journal d'audit"
          description="Dernières actions admin sur la plateforme."
        />
        <PlatformCardBody flush>
          {auditLoading ? (
            <PlatformSkeleton className="h-32 m-4" />
          ) : audit.length === 0 ? (
            <p className="plat-empty">Aucune entrée (migration 005 requise).</p>
          ) : (
            <div className="plat-list max-h-80 overflow-y-auto">
              {audit.map((entry) => (
                <div key={entry.id} className="plat-list-item items-start">
                  <div>
                    <p className="plat-cell-primary">{entry.action.replace(/_/g, " ")}</p>
                    <p className="plat-cell-muted text-xs mt-0.5">
                      {entry.actorName ?? "—"} · {entry.targetTenantName ?? "—"} · {new Date(entry.createdAt).toLocaleString("fr-DZ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PlatformCardBody>
      </PlatformCard>

      <PlatformCard>
        <PlatformCardHeader title="Créer un super admin" />
        <PlatformCardBody>
          <pre className="plat-code-block">{`UPDATE profiles SET role = 'super_admin', tenant_id = NULL WHERE email = 'votre@email.com';`}</pre>
        </PlatformCardBody>
      </PlatformCard>
    </div>
  );
}
