import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Drawer } from "@heroui/react";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Shield,
  Bell,
  type LucideIcon,
} from "lucide-react";
import BrandLogo from "@/components/brand/mascot";
import { useAuth } from "@/lib/auth";
import { useLogout } from "@/api";
import { PLATFORM } from "@/lib/platform";
import { cn } from "@/lib/utils";

const navItems: { label: string; path: string; icon: LucideIcon }[] = [
  { label: "Vue d'ensemble", path: "/", icon: LayoutDashboard },
  { label: "Alertes", path: "/alerts", icon: Bell },
  { label: "Commerces", path: "/businesses", icon: Building2 },
  { label: "Abonnements", path: "/subscriptions", icon: CreditCard },
  { label: "Paiements", path: "/payments", icon: Receipt },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
  { label: "Paramètres", path: "/settings", icon: Settings },
];

function platformPath(path: string) {
  return path === "/" ? "/platform" : `/platform${path}`;
}

function BrandBlock() {
  return (
    <div className="plat-sidebar-brand">
      <BrandLogo
        role="admin"
        size="sm"
        animate={false}
        logoUrl={PLATFORM.logoUrl}
        alt={PLATFORM.name}
        primaryColor="#888888"
      />
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2>{PLATFORM.name}</h2>
          <span className="plat-owner-badge">
            <Shield size={12} aria-hidden />
            Owner
          </span>
        </div>
        <p>Console plateforme</p>
      </div>
    </div>
  );
}

function NavLinks({
  location,
  onNavigate,
}: {
  location: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="plat-nav" aria-label="Navigation plateforme">
      {navItems.map((item) => {
        const href = item.path;
        const full = platformPath(item.path);
        const active =
          item.path === "/"
            ? location === "/platform" || location === "/platform/"
            : location.startsWith(full);
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            href={href}
            onClick={onNavigate}
            className={cn("plat-nav-link", active && "is-active")}
          >
            <Icon strokeWidth={active ? 2.25 : 2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="plat-sidebar-footer">
      <button type="button" className="plat-logout-btn" onClick={onLogout}>
        <LogOut size={16} />
        Déconnexion
      </button>
    </div>
  );
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout, user } = useAuth();
  const logoutMutation = useLogout();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      logout();
      setLocation("~/shop");
    }
  };

  const currentPage = navItems.find((item) => {
    const full = platformPath(item.path);
    return item.path === "/"
      ? location === "/platform" || location === "/platform/"
      : location.startsWith(full);
  });

  return (
    <div className="plat-shell">
      <div className="plat-layout">
        <aside className="plat-sidebar">
          <BrandBlock />
          <NavLinks location={location} />
          <SidebarFooter onLogout={handleLogout} />
        </aside>

        {mobileOpen && (
          <Drawer isOpen={mobileOpen} onOpenChange={setMobileOpen}>
            <Drawer.Backdrop>
              <Drawer.Content placement="left" className="w-72 max-w-[85vw]">
                <Drawer.Dialog>
                  <Drawer.Header>
                    <Drawer.Heading>Menu</Drawer.Heading>
                  </Drawer.Header>
                  <Drawer.Body className="p-0 flex flex-col">
                    <BrandBlock />
                    <NavLinks location={location} onNavigate={() => setMobileOpen(false)} />
                  </Drawer.Body>
                  <Drawer.Footer className="flex-col gap-1 p-0">
                    <SidebarFooter onLogout={handleLogout} />
                  </Drawer.Footer>
                </Drawer.Dialog>
              </Drawer.Content>
            </Drawer.Backdrop>
          </Drawer>
        )}

        <div className="plat-main">
          <header className="plat-topbar">
            <button
              type="button"
              className="plat-menu-btn"
              onClick={() => setMobileOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="plat-topbar-title">{currentPage?.label ?? "Plateforme"}</p>
              <p className="plat-topbar-sub">
                {user?.fullName}
                <span className="hidden sm:inline"> · super_admin</span>
              </p>
            </div>
          </header>

          <main id="main-content" className="plat-content">
            <div className="plat-content-inner">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
