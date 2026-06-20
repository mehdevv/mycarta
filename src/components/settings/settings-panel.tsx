import { useState } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, Loader2, Save, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGetSettings } from "@/api";
import { useDeleteTenantAccount } from "@/api/tenant";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useCurrentTenant } from "@/lib/tenant-context";
import { PLANS } from "@/lib/pricing";
import { getListActivitiesQueryKey, logTenantActivity } from "@/api/activities";
import { useQueryClient } from "@tanstack/react-query";
const statusLabels: Record<string, string> = {
  trialing: "Essai",
  active: "Actif",
  past_due: "En retard",
  canceled: "Annulé",
  expired: "Expiré",
};

export default function SettingsPanel() {
  const { data: settings } = useGetSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const { slug, tenant } = useCurrentTenant();
  const [, setLocation] = useLocation();
  const deleteAccount = useDeleteTenantAccount();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [confirmSlug, setConfirmSlug] = useState("");

  const planName = PLANS.find((p) => p.id === tenant?.planId)?.name ?? tenant?.planId ?? "—";
  const subStatus = tenant?.subscriptionStatus ?? "trialing";

  const changePassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: "Mot de passe trop court", description: "8 caractères minimum", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Les mots de passe ne correspondent pas", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      await logTenantActivity({
        kind: "security.password_changed",
        title: "Password changed",
      });
      void queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
      toast({ title: "Mot de passe mis à jour" });
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Impossible de changer le mot de passe",
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const resetDeleteDialog = () => {
    setDeletePassword("");
    setConfirmSlug("");
    setDeleteOpen(false);
  };

  const handleDeleteAccount = async () => {
    if (!slug) {
      toast({ title: "Impossible de charger la boutique", variant: "destructive" });
      return;
    }
    if (confirmSlug !== slug) {
      toast({
        title: "Identifiant incorrect",
        description: `Tapez exactement : ${slug}`,
        variant: "destructive",
      });
      return;
    }
    if (!deletePassword) {
      toast({ title: "Mot de passe requis", variant: "destructive" });
      return;
    }
    try {
      await deleteAccount.mutateAsync({ password: deletePassword, confirmSlug });
      resetDeleteDialog();
      await logout();
      setLocation("/");
      toast({ title: "Compte supprimé" });
    } catch (e) {
      toast({
        title: "Suppression impossible",
        description: e instanceof Error ? e.message : "Une erreur est survenue",
        variant: "destructive",
      });
    }
  };

  return (
    <article className="dash-card dash-settings-panel">
      <div className="dash-settings-block">
        <div className="dash-settings-block-head">
          <h2 className="dash-settings-block-title">Compte</h2>
          <p className="dash-settings-block-desc">Informations en lecture seule de votre boutique.</p>
        </div>
        <dl className="dash-settings-info-grid">
          <div className="dash-settings-info-item">
            <dt className="dash-settings-label">Commerce</dt>
            <dd className="dash-settings-value">{settings?.businessName ?? tenant?.name ?? "—"}</dd>
          </div>
          <div className="dash-settings-info-item">
            <dt className="dash-settings-label">Identifiant URL</dt>
            <dd className="dash-settings-value font-mono">{slug ?? "—"}</dd>
          </div>
          <div className="dash-settings-info-item">
            <dt className="dash-settings-label">Forfait</dt>
            <dd className="dash-settings-value dash-settings-value--badge">
              <span>{planName}</span>
              <span className="dash-badge dash-badge--muted">
                {statusLabels[subStatus] ?? subStatus}
              </span>
            </dd>
          </div>
          <div className="dash-settings-info-item">
            <dt className="dash-settings-label">Email</dt>
            <dd className="dash-settings-value truncate">{user?.email ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <div className="dash-settings-divider" />

      <div className="dash-settings-block">
        <div className="dash-settings-block-head">
          <h2 className="dash-settings-block-title">Sécurité</h2>
          <p className="dash-settings-block-desc">Modifiez votre mot de passe de connexion.</p>
        </div>
        <div className="dash-settings-fields dash-settings-fields--2">
          <div className="dash-settings-field">
            <label className="dash-settings-label" htmlFor="settings-password">
              Nouveau mot de passe
            </label>
            <input
              id="settings-password"
              type="password"
              className="dash-settings-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="8 caractères minimum"
              autoComplete="new-password"
            />
          </div>
          <div className="dash-settings-field">
            <label className="dash-settings-label" htmlFor="settings-password-confirm">
              Confirmer le mot de passe
            </label>
            <input
              id="settings-password-confirm"
              type="password"
              className="dash-settings-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>
        <div className="dash-settings-footer">
          <button
            type="button"
            className="dash-btn-primary dash-settings-save-btn"
            onClick={() => void changePassword()}
            disabled={savingPassword || !newPassword}
          >
            {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Mettre à jour le mot de passe
          </button>
        </div>
      </div>

      <div className="dash-settings-divider" />

      <div className="dash-settings-block dash-settings-danger">
        <div className="dash-settings-danger-inner">
          <div className="min-w-0">
            <p className="dash-settings-danger-title">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Supprimer le compte
            </p>
            <p className="dash-settings-danger-desc">
              Efface définitivement {tenant?.name ?? "votre boutique"} et toutes les données associées.
            </p>
          </div>
          <button type="button" className="dash-settings-danger-btn" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Supprimer le compte
          </button>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={(open) => !open && resetDeleteDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le compte ?</DialogTitle>
            <DialogDescription>
              Confirmez avec votre mot de passe et l&apos;identifiant{" "}
              <strong>{slug ?? "boutique"}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="dash-settings-field">
              <label className="dash-settings-label" htmlFor="delete-slug">
                Identifiant boutique
              </label>
              <input
                id="delete-slug"
                className="dash-settings-input"
                value={confirmSlug}
                onChange={(e) => setConfirmSlug(e.target.value)}
                placeholder={slug ?? "identifiant"}
                autoComplete="off"
              />
            </div>
            <div className="dash-settings-field">
              <label className="dash-settings-label" htmlFor="delete-password">
                Mot de passe
              </label>
              <input
                id="delete-password"
                type="password"
                className="dash-settings-input"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={resetDeleteDialog} disabled={deleteAccount.isPending}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteAccount()}
              disabled={deleteAccount.isPending || !deletePassword || !slug || confirmSlug !== slug}
            >
              {deleteAccount.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
