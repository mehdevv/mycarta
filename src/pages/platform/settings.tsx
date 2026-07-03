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
  const [commissionBoutique, setCommissionBoutique] = useState("10");
  const [commissionMaison, setCommissionMaison] = useState("12");
  const [commissionPrestige, setCommissionPrestige] = useState("15");
  const [affPriceBoutiqueMonthly, setAffPriceBoutiqueMonthly] = useState("2320");
  const [affPriceBoutiqueAnnual, setAffPriceBoutiqueAnnual] = useState("23200");
  const [affPriceMaisonMonthly, setAffPriceMaisonMonthly] = useState("4320");
  const [affPriceMaisonAnnual, setAffPriceMaisonAnnual] = useState("43200");
  const [affCommissionBoutique, setAffCommissionBoutique] = useState("15");
  const [affCommissionMaison, setAffCommissionMaison] = useState("18");

  useEffect(() => {
    if (settings) {
      setBank(settings.bank_details ?? "");
      setSupportEmail(settings.support_email ?? "");
      setMaintenanceEnabled(settings.maintenance_enabled ?? false);
      setMaintenanceBanner(settings.maintenance_banner ?? "");
      setCommissionBoutique(String(settings.commission_rate_boutique ?? 10));
      setCommissionMaison(String(settings.commission_rate_maison ?? 12));
      setCommissionPrestige(String(settings.commission_rate_prestige ?? 15));
      setAffPriceBoutiqueMonthly(String(settings.affiliate_price_boutique_monthly ?? 2320));
      setAffPriceBoutiqueAnnual(String(settings.affiliate_price_boutique_annual ?? 23200));
      setAffPriceMaisonMonthly(String(settings.affiliate_price_maison_monthly ?? 4320));
      setAffPriceMaisonAnnual(String(settings.affiliate_price_maison_annual ?? 43200));
      setAffCommissionBoutique(String(settings.affiliate_commission_rate_boutique ?? 15));
      setAffCommissionMaison(String(settings.affiliate_commission_rate_maison ?? 18));
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        bank_details: bank,
        support_email: supportEmail,
        maintenance_enabled: maintenanceEnabled,
        maintenance_banner: maintenanceBanner,
        commission_rate_boutique: Number(commissionBoutique),
        commission_rate_maison: Number(commissionMaison),
        commission_rate_prestige: Number(commissionPrestige),
        affiliate_price_boutique_monthly: Number(affPriceBoutiqueMonthly),
        affiliate_price_boutique_annual: Number(affPriceBoutiqueAnnual),
        affiliate_price_maison_monthly: Number(affPriceMaisonMonthly),
        affiliate_price_maison_annual: Number(affPriceMaisonAnnual),
        affiliate_commission_rate_boutique: Number(affCommissionBoutique),
        affiliate_commission_rate_maison: Number(affCommissionMaison),
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
        <PlatformCardHeader
          title="Commissions commerciales"
          description="Taux de commission (%) appliqués par plan lors d'un paiement validé."
        />
        <PlatformCardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="plat-label" htmlFor="commission-boutique">Boutique (%)</label>
              <input
                id="commission-boutique"
                className="plat-input"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={commissionBoutique}
                onChange={(e) => setCommissionBoutique(e.target.value)}
              />
            </div>
            <div>
              <label className="plat-label" htmlFor="commission-maison">Maison (%)</label>
              <input
                id="commission-maison"
                className="plat-input"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={commissionMaison}
                onChange={(e) => setCommissionMaison(e.target.value)}
              />
            </div>
            <div>
              <label className="plat-label" htmlFor="commission-prestige">Prestige (%)</label>
              <input
                id="commission-prestige"
                className="plat-input"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={commissionPrestige}
                onChange={(e) => setCommissionPrestige(e.target.value)}
              />
            </div>
          </div>
          <PlatformButton onClick={handleSave} disabled={updateSettings.isPending}>Enregistrer les taux</PlatformButton>
        </PlatformCardBody>
      </PlatformCard>

      <PlatformCard>
        <PlatformCardHeader
          title="Programme affiliés"
          description="Tarifs fixes pour les commerces parrainés (3 mois après 1er paiement) et taux de commission affilié."
        />
        <PlatformCardBody className="space-y-6">
          <div>
            <p className="plat-cell-primary text-sm mb-3">Tarifs affiliés (DZD)</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="plat-label" htmlFor="aff-b-m">Boutique mensuel</label>
                <input id="aff-b-m" className="plat-input" type="number" min={0} value={affPriceBoutiqueMonthly} onChange={(e) => setAffPriceBoutiqueMonthly(e.target.value)} />
              </div>
              <div>
                <label className="plat-label" htmlFor="aff-b-a">Boutique annuel</label>
                <input id="aff-b-a" className="plat-input" type="number" min={0} value={affPriceBoutiqueAnnual} onChange={(e) => setAffPriceBoutiqueAnnual(e.target.value)} />
              </div>
              <div>
                <label className="plat-label" htmlFor="aff-m-m">Maison mensuel</label>
                <input id="aff-m-m" className="plat-input" type="number" min={0} value={affPriceMaisonMonthly} onChange={(e) => setAffPriceMaisonMonthly(e.target.value)} />
              </div>
              <div>
                <label className="plat-label" htmlFor="aff-m-a">Maison annuel</label>
                <input id="aff-m-a" className="plat-input" type="number" min={0} value={affPriceMaisonAnnual} onChange={(e) => setAffPriceMaisonAnnual(e.target.value)} />
              </div>
            </div>
          </div>
          <div>
            <p className="plat-cell-primary text-sm mb-3">Commission affilié (%)</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="plat-label" htmlFor="aff-comm-b">Boutique</label>
                <input id="aff-comm-b" className="plat-input" type="number" min={0} max={100} step={0.5} value={affCommissionBoutique} onChange={(e) => setAffCommissionBoutique(e.target.value)} />
              </div>
              <div>
                <label className="plat-label" htmlFor="aff-comm-m">Maison</label>
                <input id="aff-comm-m" className="plat-input" type="number" min={0} max={100} step={0.5} value={affCommissionMaison} onChange={(e) => setAffCommissionMaison(e.target.value)} />
              </div>
            </div>
          </div>
          <PlatformButton onClick={handleSave} disabled={updateSettings.isPending}>Enregistrer affiliés</PlatformButton>
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
