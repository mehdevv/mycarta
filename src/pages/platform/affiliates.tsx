import { useState } from "react";
import {
  affiliateReferralUrl,
  useAffiliateCommissions,
  useAffiliates,
  useCreateAffiliate,
  useToggleAffiliateActive,
  useUpdateAffiliateCommissionStatus,
} from "@/api/affiliate";
import {
  PlatformPageHeader,
  PlatformCard,
  PlatformCardHeader,
  PlatformCardBody,
  PlatformButton,
  PlatformSkeleton,
  PlatformTabs,
} from "@/components/platform/platform-ui";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { formatDzd, PLANS } from "@/lib/pricing";
import { Copy } from "lucide-react";

type Tab = "affiliates" | "commissions";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvé",
  paid: "Payé",
};

export default function PlatformAffiliatesPage() {
  const [tab, setTab] = useState<Tab>("affiliates");
  const { data: affiliates = [], isLoading } = useAffiliates();
  const { data: commissions = [], isLoading: commissionsLoading } = useAffiliateCommissions();
  const createAffiliate = useCreateAffiliate();
  const toggleActive = useToggleAffiliateActive();
  const updateStatus = useUpdateAffiliateCommissionStatus();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [affiliateCode, setAffiliateCode] = useState("");
  const [socialHandle, setSocialHandle] = useState("");

  const handleCreate = async () => {
    try {
      await createAffiliate.mutateAsync({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.replace(/\D/g, ""),
        password,
        affiliateCode: affiliateCode.trim(),
        socialHandle: socialHandle.trim() || undefined,
      });
      toast({ title: "Affilié créé" });
      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setAffiliateCode("");
      setSocialHandle("");
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Échec",
        variant: "destructive",
      });
    }
  };

  const copyLink = async (code: string) => {
    try {
      await navigator.clipboard.writeText(affiliateReferralUrl(code));
      toast({ title: "Lien copié" });
    } catch {
      toast({ title: "Copie impossible", variant: "destructive" });
    }
  };

  const handleCommissionStatus = async (commissionId: string, status: "approved" | "paid") => {
    try {
      await updateStatus.mutateAsync({ commissionId, status });
      toast({ title: status === "paid" ? "Commission payée" : "Commission approuvée" });
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Échec",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="plat-stack">
      <PlatformPageHeader
        title="Affiliés"
        description="Créateurs et marketeurs — codes de parrainage, tarifs réduits et commissions."
      />

      <PlatformTabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "affiliates", label: "Partenaires" },
          { value: "commissions", label: "Commissions affiliés" },
        ]}
      />

      {tab === "affiliates" ? (
        <>
          <PlatformCard>
            <PlatformCardHeader title="Créer un affilié" description="Compte de connexion + code unique." />
            <PlatformCardBody className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="plat-label" htmlFor="aff-name">Nom complet</label>
                  <input id="aff-name" className="plat-input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div>
                  <label className="plat-label" htmlFor="aff-code">Code affilié</label>
                  <input
                    id="aff-code"
                    className="plat-input uppercase"
                    value={affiliateCode}
                    onChange={(e) => setAffiliateCode(e.target.value.toUpperCase())}
                    placeholder="SARAH10"
                  />
                </div>
                <div>
                  <label className="plat-label" htmlFor="aff-email">Email</label>
                  <input id="aff-email" className="plat-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="plat-label" htmlFor="aff-phone">Téléphone</label>
                  <input id="aff-phone" className="plat-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div>
                  <label className="plat-label" htmlFor="aff-password">Mot de passe</label>
                  <input
                    id="aff-password"
                    className="plat-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="plat-label" htmlFor="aff-social">Réseau social (optionnel)</label>
                  <input
                    id="aff-social"
                    className="plat-input"
                    value={socialHandle}
                    onChange={(e) => setSocialHandle(e.target.value)}
                    placeholder="@sarah"
                  />
                </div>
              </div>
              <PlatformButton onClick={() => void handleCreate()} disabled={createAffiliate.isPending}>
                Créer l'affilié
              </PlatformButton>
            </PlatformCardBody>
          </PlatformCard>

          <PlatformCard>
            <PlatformCardHeader title={`Partenaires (${affiliates.length})`} />
            <PlatformCardBody flush>
              {isLoading ? (
                <PlatformSkeleton className="h-48 m-4" />
              ) : affiliates.length === 0 ? (
                <p className="plat-empty p-6">Aucun affilié.</p>
              ) : (
                <div className="plat-list">
                  {affiliates.map((a) => (
                    <div key={a.id} className="plat-list-item flex-col sm:flex-row gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="plat-cell-primary">{a.full_name}</p>
                          <span className="plat-badge font-mono">{a.affiliate_code}</span>
                          {a.social_handle && (
                            <span className="plat-cell-muted text-xs">@{a.social_handle}</span>
                          )}
                        </div>
                        <p className="plat-cell-muted text-sm">
                          {a.email} · {a.signup_count} inscriptions · {a.conversion_count} conversions ·{" "}
                          {formatDzd(a.pending_commission_dzd)} en attente
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <PlatformButton
                          size="sm"
                          variant="secondary"
                          className="gap-2"
                          onClick={() => void copyLink(a.affiliate_code)}
                        >
                          <Copy className="h-4 w-4" />
                          Lien
                        </PlatformButton>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">Actif</span>
                          <Switch
                            checked={a.is_active}
                            onCheckedChange={(v) =>
                              void toggleActive.mutateAsync({ affiliateId: a.id, isActive: v })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PlatformCardBody>
          </PlatformCard>
        </>
      ) : (
        <PlatformCard>
          <PlatformCardHeader
            title="Commissions affiliés"
            description="Approuvez et marquez comme payées (virement manuel)."
          />
          <PlatformCardBody flush>
            {commissionsLoading ? (
              <PlatformSkeleton className="h-48 m-4" />
            ) : commissions.length === 0 ? (
              <p className="plat-empty p-6">Aucune commission.</p>
            ) : (
              <div className="plat-list">
                {commissions.map((c) => {
                  const planName = PLANS.find((p) => p.id === c.plan_id)?.name ?? c.plan_id;
                  return (
                    <div key={c.id} className="plat-list-item flex-col sm:flex-row gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="plat-cell-primary">
                          {c.affiliate_name} → {c.business_name}
                        </p>
                        <p className="plat-cell-muted text-sm">
                          {planName} · {formatDzd(c.commission_dzd)} ({c.commission_rate}%)
                        </p>
                        <p className="plat-cell-muted text-xs">
                          {new Date(c.created_at).toLocaleDateString("fr-DZ")} · période {c.payment_period}/3
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="plat-badge">{STATUS_LABELS[c.status] ?? c.status}</span>
                        {c.status === "pending" && (
                          <PlatformButton
                            size="sm"
                            variant="secondary"
                            onClick={() => void handleCommissionStatus(c.id, "approved")}
                            disabled={updateStatus.isPending}
                          >
                            Approuver
                          </PlatformButton>
                        )}
                        {(c.status === "pending" || c.status === "approved") && (
                          <PlatformButton
                            size="sm"
                            onClick={() => void handleCommissionStatus(c.id, "paid")}
                            disabled={updateStatus.isPending}
                          >
                            Marquer payé
                          </PlatformButton>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </PlatformCardBody>
        </PlatformCard>
      )}
    </div>
  );
}
