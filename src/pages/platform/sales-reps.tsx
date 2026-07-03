import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  useAssignableTenants,
  useAssignTenantSalesRep,
  useCreateSalesRep,
  useSalesReps,
  useToggleSalesRepActive,
} from "@/api/sales";
import {
  PlatformPageHeader,
  PlatformCard,
  PlatformCardHeader,
  PlatformCardBody,
  PlatformButton,
  PlatformSkeleton,
  PlatformTabs,
  StatusBadge,
} from "@/components/platform/platform-ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { formatDzd, PLANS } from "@/lib/pricing";
import { Briefcase, Search } from "lucide-react";

type AssignFilter = "all" | "unassigned" | "assigned";

function daysLeft(tenant: {
  subscriptionStatus: string;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
}) {
  const end =
    tenant.subscriptionStatus === "trialing"
      ? tenant.trialEndsAt
      : tenant.subscriptionEndsAt;
  if (!end) return null;
  const ms = new Date(end).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

export default function PlatformSalesRepsPage() {
  const { data: reps = [], isLoading: repsLoading } = useSalesReps();
  const { data: tenants = [], isLoading: tenantsLoading } = useAssignableTenants();
  const assignRep = useAssignTenantSalesRep();
  const createRep = useCreateSalesRep();
  const toggleActive = useToggleSalesRepActive();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");
  const [assignFilter, setAssignFilter] = useState<AssignFilter>("unassigned");
  const [draftRepByTenant, setDraftRepByTenant] = useState<Record<string, string>>({});

  const activeReps = reps.filter((r) => r.is_active);

  const filteredTenants = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tenants.filter((t) => {
      if (assignFilter === "unassigned" && t.assignedSalesRepId) return false;
      if (assignFilter === "assigned" && !t.assignedSalesRepId) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (t.assignedRepName?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [tenants, search, assignFilter]);

  const handleCreate = async () => {
    try {
      await createRep.mutateAsync({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.replace(/\D/g, ""),
        password,
      });
      toast({ title: "Commercial créé" });
      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("");
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Échec",
        variant: "destructive",
      });
    }
  };

  const handleAssign = async (tenantId: string) => {
    const draft = draftRepByTenant[tenantId];
    const tenant = tenants.find((t) => t.id === tenantId);
    const repId = draft ?? tenant?.assignedSalesRepId ?? "none";

    try {
      await assignRep.mutateAsync({
        tenantId,
        repId: repId === "none" ? null : repId,
      });
      toast({ title: "Commercial assigné" });
      setDraftRepByTenant((prev) => {
        const next = { ...prev };
        delete next[tenantId];
        return next;
      });
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
        title="Commerciaux"
        description="Créez des commerciaux et assignez les commerces actifs directement depuis cette page."
      />

      <PlatformCard>
        <PlatformCardHeader
          title={`Commerces actifs (${tenants.length})`}
          description="Essais et abonnements actifs — assignez un commercial en un clic."
        />
        <PlatformCardBody className="space-y-4">
          <div className="plat-toolbar flex-wrap">
            <div className="plat-search-wrap flex-1 min-w-[200px]">
              <Search className="plat-search-icon" />
              <input
                type="search"
                className="plat-input"
                placeholder="Rechercher un commerce…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <PlatformTabs
              value={assignFilter}
              onChange={setAssignFilter}
              items={[
                { value: "unassigned", label: "Non assignés" },
                { value: "all", label: "Tous actifs" },
                { value: "assigned", label: "Assignés" },
              ]}
            />
          </div>

          {tenantsLoading ? (
            <PlatformSkeleton className="h-48 w-full" />
          ) : filteredTenants.length === 0 ? (
            <p className="plat-empty py-8">
              {assignFilter === "unassigned"
                ? "Tous les commerces actifs ont déjà un commercial."
                : "Aucun commerce trouvé."}
            </p>
          ) : (
            <div className="plat-list border border-white/10 rounded-xl overflow-hidden">
              {filteredTenants.map((tenant) => {
                const left = daysLeft(tenant);
                const planName = PLANS.find((p) => p.id === tenant.planId)?.name ?? tenant.planId;
                const selectedRep =
                  draftRepByTenant[tenant.id] ??
                  tenant.assignedSalesRepId ??
                  "none";

                return (
                  <div key={tenant.id} className="plat-list-item flex-col sm:flex-row sm:items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/businesses/${tenant.id}`}
                          className="plat-cell-primary font-medium hover:underline"
                        >
                          {tenant.name}
                        </Link>
                        <StatusBadge status={tenant.subscriptionStatus} />
                        {left != null && (
                          <span className="plat-badge">{left}j restants</span>
                        )}
                      </div>
                      <p className="plat-cell-muted text-sm mt-0.5">
                        {tenant.slug} · {planName}
                        {tenant.assignedRepName ? ` · ${tenant.assignedRepName}` : " · Non assigné"}
                      </p>
                    </div>

                    <div className="plat-toolbar w-full sm:w-auto shrink-0">
                      <Select
                        value={selectedRep}
                        onValueChange={(v) =>
                          setDraftRepByTenant((prev) => ({ ...prev, [tenant.id]: v }))
                        }
                      >
                        <SelectTrigger className="plat-select w-full sm:w-48">
                          <SelectValue placeholder="Commercial" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucun</SelectItem>
                          {activeReps.map((rep) => (
                            <SelectItem key={rep.id} value={rep.id}>
                              {rep.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <PlatformButton
                        size="sm"
                        onClick={() => void handleAssign(tenant.id)}
                        disabled={assignRep.isPending || activeReps.length === 0}
                      >
                        Assigner
                      </PlatformButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeReps.length === 0 && !repsLoading && (
            <p className="text-sm plat-cell-muted">
              Créez d&apos;abord un commercial actif pour pouvoir assigner des commerces.
            </p>
          )}
        </PlatformCardBody>
      </PlatformCard>

      <PlatformCard>
        <PlatformCardHeader title="Nouveau commercial" />
        <PlatformCardBody className="space-y-4 max-w-xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="plat-label">Nom complet</label>
              <input className="plat-input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <label className="plat-label">Email</label>
              <input className="plat-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="plat-label">Téléphone</label>
              <input className="plat-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="plat-label">Mot de passe</label>
              <input className="plat-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <PlatformButton onClick={() => void handleCreate()} disabled={createRep.isPending}>
            Créer le compte
          </PlatformButton>
        </PlatformCardBody>
      </PlatformCard>

      <PlatformCard>
        <PlatformCardHeader title={`Équipe (${reps.length})`} />
        <PlatformCardBody flush>
          {repsLoading ? (
            <PlatformSkeleton className="h-40 m-4" />
          ) : reps.length === 0 ? (
            <p className="plat-empty p-6">Aucun commercial pour le moment.</p>
          ) : (
            <div className="plat-list">
              {reps.map((rep) => (
                <div key={rep.id} className="plat-list-item">
                  <div className="flex items-start gap-3">
                    <Briefcase className="h-5 w-5 mt-0.5 opacity-60" />
                    <div>
                      <p className="plat-cell-primary">{rep.full_name}</p>
                      <p className="plat-cell-muted text-sm">{rep.email} · {rep.phone ?? "—"}</p>
                      <p className="plat-cell-muted text-xs">
                        {rep.tenant_count} commerce(s) · {formatDzd(rep.pending_commission_dzd)} en attente
                      </p>
                    </div>
                  </div>
                  <div className="plat-field-row">
                    <span className="text-sm plat-cell-muted">{rep.is_active ? "Actif" : "Inactif"}</span>
                    <Switch
                      checked={rep.is_active}
                      onCheckedChange={(checked) => {
                        void toggleActive.mutateAsync({ repId: rep.id, isActive: checked });
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </PlatformCardBody>
      </PlatformCard>
    </div>
  );
}
