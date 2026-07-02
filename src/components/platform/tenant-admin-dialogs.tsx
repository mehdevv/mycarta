import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlatformButton } from "@/components/platform/platform-ui";
import { BrandedQrCode } from "@/components/shared/branded-qr-code";
import { useOverrideTenantPlan, usePlatformTenantAction } from "@/api/platform";
import type { PlatformSubscription, PlatformTenantRow } from "@/api/platform";
import type { PlanId } from "@/lib/pricing";
import { tenantClientLink } from "@/lib/links";
import { useShopBranding } from "@/hooks/use-branding";
import { useToast } from "@/hooks/use-toast";
import { formatDzd } from "@/lib/pricing";
import { ExternalLink } from "lucide-react";

type SubscriptionRef = Pick<
  PlatformSubscription,
  "id" | "plan_id" | "status" | "amount_dzd" | "billing_period" | "tenant_id"
> & {
  tenants?: PlatformSubscription["tenants"];
};

type TenantRef = Pick<PlatformTenantRow, "id" | "slug" | "name" | "planId" | "subscriptionStatus">;

export function TenantClientQrDialog({
  tenant,
  open,
  onOpenChange,
}: {
  tenant: TenantRef | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { logoUrl } = useShopBranding(tenant?.slug);

  if (!tenant) return null;

  const enrolUrl = tenantClientLink(tenant.slug);
  const isActive = ["trialing", "active"].includes(tenant.subscriptionStatus);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="plat-dialog sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR portail client — {tenant.name}</DialogTitle>
          <DialogDescription>
            Les clients scannent ce code pour s&apos;inscrire ou ouvrir leur carte fidélité.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <BrandedQrCode value={enrolUrl} size={200} logoUrl={logoUrl} />
          </div>
          <p className="text-xs font-mono text-center break-all opacity-70">{enrolUrl}</p>
          {!isActive && (
            <p className="text-xs text-amber-400 text-center">
              Commerce inactif — le QR fonctionne mais l&apos;accès peut être limité.
            </p>
          )}
          <a
            href={enrolUrl}
            target="_blank"
            rel="noreferrer"
            className="plat-link inline-flex items-center gap-1.5 text-sm"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ouvrir la page client
          </a>
        </div>
        <DialogFooter>
          <PlatformButton variant="secondary" onClick={() => onOpenChange(false)}>
            Fermer
          </PlatformButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TenantPlanDialog({
  tenant,
  open,
  onOpenChange,
  onSuccess,
}: {
  tenant: TenantRef | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const overridePlan = useOverrideTenantPlan();
  const [planId, setPlanId] = useState<PlanId>("maison");

  useEffect(() => {
    if (tenant?.planId) {
      setPlanId(tenant.planId as PlanId);
    }
  }, [tenant?.planId, open]);

  if (!tenant) return null;

  const handleApply = async () => {
    try {
      await overridePlan.mutateAsync({ tenantId: tenant.id, planId });
      toast({ title: "Plan mis à jour", description: `${tenant.name} → ${planId}` });
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Échec",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="plat-dialog sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Changer le plan — {tenant.name}</DialogTitle>
          <DialogDescription>
            Promotion manuelle du commerce vers un plan supérieur (ou rétrogradation).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm opacity-70">
            Plan actuel : <strong>{tenant.planId}</strong>
          </p>
          <Select value={planId} onValueChange={(v) => setPlanId(v as PlanId)}>
            <SelectTrigger className="plat-select w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trial">Essai gratuit</SelectItem>
              <SelectItem value="boutique">Boutique</SelectItem>
              <SelectItem value="maison">Maison</SelectItem>
              <SelectItem value="prestige">Prestige</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <PlatformButton variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </PlatformButton>
          <PlatformButton onClick={handleApply} disabled={overridePlan.isPending}>
            Appliquer le plan
          </PlatformButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TenantDeleteDialog({
  tenant,
  open,
  onOpenChange,
  onDeleted,
}: {
  tenant: TenantRef | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const { toast } = useToast();
  const tenantAction = usePlatformTenantAction();
  const [confirmSlug, setConfirmSlug] = useState("");

  useEffect(() => {
    if (!open) setConfirmSlug("");
  }, [open]);

  if (!tenant) return null;

  const handleDelete = async () => {
    try {
      await tenantAction.mutateAsync({
        tenantId: tenant.id,
        action: "delete_tenant",
        confirmSlug,
      });
      toast({ title: "Commerce supprimé", description: tenant.name });
      onOpenChange(false);
      onDeleted?.();
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Échec",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="plat-dialog sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Supprimer {tenant.name} ?</DialogTitle>
          <DialogDescription>
            Supprime le commerce, toutes ses données et les comptes propriétaire / employés.
            Action irréversible. Tapez <strong>{tenant.slug}</strong> pour confirmer.
          </DialogDescription>
        </DialogHeader>
        <input
          className="plat-input"
          value={confirmSlug}
          onChange={(e) => setConfirmSlug(e.target.value)}
          placeholder={tenant.slug}
          autoComplete="off"
        />
        <DialogFooter>
          <PlatformButton variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </PlatformButton>
          <PlatformButton
            variant="danger"
            onClick={handleDelete}
            disabled={confirmSlug !== tenant.slug || tenantAction.isPending}
          >
            Supprimer définitivement
          </PlatformButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SubscriptionDeleteDialog({
  subscription,
  open,
  onOpenChange,
  onSuccess,
}: {
  subscription: SubscriptionRef | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const tenantAction = usePlatformTenantAction();

  if (!subscription) return null;

  const shopName = subscription.tenants?.name ?? "ce commerce";
  const wasActive = subscription.status === "active" || subscription.status === "pending";

  const handleDelete = async () => {
    try {
      const result = await tenantAction.mutateAsync({
        action: "delete_subscription",
        subscriptionId: subscription.id,
        tenantId: subscription.tenant_id,
      }) as { tenantDeactivated?: boolean };

      toast({
        title: "Abonnement supprimé",
        description: result?.tenantDeactivated
          ? `${shopName} a été désactivé (plus d'abonnement actif).`
          : undefined,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Échec",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="plat-dialog sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Supprimer cet abonnement ?</DialogTitle>
          <DialogDescription>
            {shopName} · {subscription.plan_id} · {formatDzd(subscription.amount_dzd)}
            {wasActive && (
              <>
                {" "}
                — si c&apos;est le dernier abonnement actif, le commerce sera automatiquement
                désactivé.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <PlatformButton variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </PlatformButton>
          <PlatformButton variant="danger" onClick={handleDelete} disabled={tenantAction.isPending}>
            Supprimer
          </PlatformButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
