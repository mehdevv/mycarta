import { Link } from "wouter";
import { Shield, Building2, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLogout } from "@/api";
import { PLATFORM } from "@/lib/platform";
import type { UserRole } from "@/api/types";
import { PlatformButton } from "@/components/platform/platform-ui";

const roleLabels: Record<UserRole, string> = {
  owner: "propriétaire de commerce",
  worker: "employé",
  super_admin: "super admin",
};

export default function PlatformAccessDenied({ role }: { role: UserRole }) {
  const { logout, user } = useAuth();
  const logoutMutation = useLogout();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    logout();
    window.location.href = "/shop";
  };

  return (
    <div className="plat-gate">
      <div className="plat-gate-card space-y-6">
        <div className="flex items-center gap-3">
          <div className="plat-stat-icon plat-stat-icon--warning">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="plat-page-title text-lg">Console plateforme</h1>
            <p className="plat-page-desc text-sm">Accès réservé au propriétaire SaaS</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed" style={{ color: "var(--plat-text-secondary)" }}>
          Vous êtes connecté en tant que <strong style={{ color: "var(--plat-text)" }}>{roleLabels[role]}</strong>
          {user?.email ? ` (${user.email})` : ""}. Cette zone est distincte du tableau de bord
          commerce à <code>/dashboard</code>.
        </p>

        {role === "owner" && (
          <div className="plat-meta-box space-y-2">
            <p className="plat-page-eyebrow">Promouvoir votre compte (Supabase SQL)</p>
            <pre className="plat-code-block">
{`UPDATE profiles
SET role = 'super_admin',
    tenant_id = NULL
WHERE email = '${user?.email ?? "votre@email.com"}';`}
            </pre>
            <p className="text-xs" style={{ color: "var(--plat-text-secondary)" }}>
              Exécutez dans l&apos;éditeur SQL Supabase, puis déconnectez-vous et reconnectez-vous.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          {role === "owner" && (
            <Link href="/dashboard" className="flex-1">
              <PlatformButton variant="secondary" className="w-full gap-2">
                <Building2 className="h-4 w-4" />
                Mon commerce
              </PlatformButton>
            </Link>
          )}
          <PlatformButton
            variant="secondary"
            className="flex-1 gap-2"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4" />
            Changer de compte
          </PlatformButton>
        </div>

        <p className="text-xs text-center" style={{ color: "var(--plat-text-secondary)" }}>
          {PLATFORM.name} · console propriétaire SaaS
        </p>
      </div>
    </div>
  );
}
