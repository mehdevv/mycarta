import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Drawer } from "@heroui/react";
import {
  LayoutDashboard,
  Coins,
  LogOut,
  Menu,
  Briefcase,
} from "lucide-react";
import BrandLogo from "@/components/brand/mascot";
import { useAuth } from "@/lib/auth";
import { useLogout } from "@/api";
import { PLATFORM } from "@/lib/platform";
import { cn } from "@/lib/utils";
import "@/rep.css";

const navItems = [
  { label: "Pipeline", path: "/", icon: LayoutDashboard },
  { label: "Commissions", path: "/commissions", icon: Coins },
] as const;

function isNavActive(itemPath: string, location: string) {
  if (itemPath === "/") {
    return location === "/" || location === "";
  }
  return location === itemPath || location.startsWith(`${itemPath}/`);
}

export default function RepLayout({ children }: { children: React.ReactNode }) {
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

  const currentPage = navItems.find((item) => isNavActive(item.path, location));

  return (
    <div className="plat-shell">
      <div className="plat-layout">
        <aside className="plat-sidebar">
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
                  <Briefcase size={12} aria-hidden />
                  Commercial
                </span>
              </div>
              <p>Espace CRM ventes</p>
            </div>
          </div>

          <nav className="plat-nav" aria-label="Navigation commercial">
            {navItems.map((item) => {
              const active = isNavActive(item.path, location);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={cn("plat-nav-link", active && "is-active")}
                >
                  <Icon strokeWidth={active ? 2.25 : 2} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="plat-sidebar-footer">
            <button type="button" className="plat-logout-btn" onClick={handleLogout}>
              <LogOut size={16} />
              Déconnexion
            </button>
          </div>
        </aside>

        {mobileOpen && (
          <Drawer isOpen={mobileOpen} onOpenChange={setMobileOpen}>
            <Drawer.Backdrop>
              <Drawer.Content placement="left" className="w-72 max-w-[85vw]">
                <Drawer.Dialog>
                  <Drawer.Header>
                    <Drawer.Heading>Menu</Drawer.Heading>
                  </Drawer.Header>
                  <Drawer.Body className="p-4">
                    <nav className="plat-nav">
                      {navItems.map((item) => (
                        <Link
                          key={item.path}
                          href={item.path}
                          onClick={() => setMobileOpen(false)}
                          className="plat-nav-link"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </nav>
                  </Drawer.Body>
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
              <p className="plat-topbar-title">{currentPage?.label ?? "CRM"}</p>
              <p className="plat-topbar-sub">
                {user?.fullName}
                <span className="hidden sm:inline"> · commercial</span>
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
