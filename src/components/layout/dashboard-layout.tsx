import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Drawer } from "@heroui/react";
import {
  Users,
  LayoutDashboard,
  Settings,
  Gift,
  QrCode,
  LogOut,
  Package,
  BarChart3,
  ShieldAlert,
  Menu,
  CreditCard,
  PanelLeftClose,
  PanelLeft,
  Plug,
  WalletCards,
  Lock,
  type LucideIcon,
} from "lucide-react";
import SidebarTrialStatus from "@/components/billing/sidebar-trial-status";
import BrandLogo from "@/components/brand/mascot";
import { useAuth } from "@/lib/auth";
import { useLogout, useGetSettings } from "@/api";
import { useShopBranding } from "@/hooks/use-branding";
import { useShopSettingsRealtime } from "@/hooks/use-shop-settings-realtime";
import { INTEGRATIONS_LOCKED } from "@/lib/integration-tutorials";
import { headerItem, headerStagger, staggerContainer, staggerItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

import DashboardTour from "@/components/dashboard/dashboard-tour";

const SIDEBAR_COLLAPSED_KEY = "dash-sidebar-collapsed";

const TOUR_IDS: Record<string, string> = {
  "/": "nav-overview",
  "/clients": "nav-clients",
  "/workers": "nav-workers",
  "/settings": "nav-settings",
  "/billing": "nav-billing",
  "/ccard": "nav-ccard",
  "/integrations": "nav-integrations",
};

const navItems: { label: string; path: string; icon: LucideIcon; locked?: boolean }[] = [
  { label: "Overview", path: "/", icon: LayoutDashboard },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
  { label: "Clients", path: "/clients", icon: Users },
  { label: "Scans", path: "/scans", icon: QrCode },
  { label: "Fraud", path: "/fraud", icon: ShieldAlert },
  { label: "Rewards", path: "/rewards", icon: Gift },
  { label: "Products", path: "/products", icon: Package },
  { label: "Workers", path: "/workers", icon: Users },
  { label: "Carte fidélité", path: "/ccard", icon: WalletCards },
  {
    label: "Intégrations",
    path: "/integrations",
    icon: Plug,
    locked: INTEGRATIONS_LOCKED,
  },
  { label: "Billing", path: "/billing", icon: CreditCard },
  { label: "Settings", path: "/settings", icon: Settings },
];

function dashboardPath(path: string) {
  return path === "/" ? "/dashboard" : `/dashboard${path}`;
}

function BrandBlock() {
  const { data: settings } = useGetSettings();
  const branding = useShopBranding();

  return (
    <div className="dash-sidebar-brand">
      <BrandLogo
        role="admin"
        size="sm"
        animate={false}
        logoUrl={branding.logoUrl}
        alt={branding.businessName}
        primaryColor={branding.primaryColor}
      />
      <div className="dash-sidebar-brand-text min-w-0 flex-1">
        <h2>{settings?.businessName ?? branding.businessName}</h2>
        <p>Tableau de bord</p>
      </div>
    </div>
  );
}

function NavLinks({
  location,
  onNavigate,
  animated = false,
  collapsed = false,
}: {
  location: string;
  onNavigate?: () => void;
  animated?: boolean;
  collapsed?: boolean;
}) {
  const links = navItems.map((item) => {
    const href = item.path;
    const active = !item.locked && location === dashboardPath(item.path);
    const Icon = item.icon;
    const tourId = TOUR_IDS[item.path];

    const link = item.locked ? (
      <span
        key={item.path}
        className="dash-nav-link dash-nav-link--locked"
        title={collapsed ? `${item.label} — bientôt disponible` : "Bientôt disponible"}
        aria-disabled="true"
        {...(tourId ? { "data-tour": tourId } : {})}
      >
        <Icon strokeWidth={2} />
        <span className="flex-1">{item.label}</span>
        {!collapsed && <span className="dash-nav-soon">Bientôt</span>}
        <Lock className="dash-nav-lock-icon" size={14} aria-hidden />
      </span>
    ) : (
      <Link
        key={item.path}
        href={href}
        onClick={onNavigate}
        className={cn("dash-nav-link", active && "is-active")}
        title={collapsed ? item.label : undefined}
        {...(tourId ? { "data-tour": tourId } : {})}
      >
        <Icon strokeWidth={active ? 2.25 : 2} />
        <span>{item.label}</span>
      </Link>
    );

    return animated ? (
      <motion.div key={item.path} variants={staggerItem}>
        {link}
      </motion.div>
    ) : (
      link
    );
  });

  if (animated) {
    return (
      <motion.nav
        className="dash-nav"
        aria-label="Navigation principale"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {links}
      </motion.nav>
    );
  }

  return (
    <nav className="dash-nav" aria-label="Navigation principale">
      {links}
    </nav>
  );
}

function SidebarFooter({ onLogout, collapsed }: { onLogout: () => void; collapsed?: boolean }) {
  return (
    <div className="dash-sidebar-footer">
      <SidebarTrialStatus />
      <button
        type="button"
        className="dash-logout-btn"
        onClick={onLogout}
        title={collapsed ? "Déconnexion" : undefined}
      >
        <LogOut size={16} />
        <span>Déconnexion</span>
      </button>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  });
  const { logout, user } = useAuth();
  const logoutMutation = useLogout();
  useShopSettingsRealtime();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      logout();
      setLocation("~/shop");
    }
  };

  const toggleSidebar = () => setSidebarCollapsed((c) => !c);

  const currentPage = navItems.find((item) => location === dashboardPath(item.path));

  return (
    <div className="dash-shell">
      <div className="dash-layout">
        <motion.aside
          className={cn("dash-sidebar", sidebarCollapsed && "dash-sidebar--collapsed")}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <BrandBlock />
          <NavLinks location={location} animated collapsed={sidebarCollapsed} />
          <SidebarFooter onLogout={handleLogout} collapsed={sidebarCollapsed} />
        </motion.aside>

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

        <div className="dash-main">
          <motion.header
            className="dash-topbar"
            variants={headerStagger}
            initial="initial"
            animate="animate"
          >
            <button
              type="button"
              className="dash-menu-btn"
              onClick={() => setMobileOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu size={20} />
            </button>
            <button
              type="button"
              className="dash-sidebar-toggle-btn"
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? "Agrandir le menu" : "Réduire le menu"}
              title={sidebarCollapsed ? "Agrandir le menu" : "Réduire le menu"}
            >
              {sidebarCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
            </button>
            <div className="min-w-0 flex-1">
              <motion.p className="dash-topbar-title" variants={headerItem}>
                {currentPage?.label ?? "Dashboard"}
              </motion.p>
              <motion.p className="dash-topbar-sub" variants={headerItem}>
                {user?.fullName}
              </motion.p>
            </div>
          </motion.header>

          <main id="main-content" className="dash-content">
            <div className="dash-content-inner">{children}</div>
          </main>
        </div>
      </div>
      <DashboardTour />
    </div>
  );
}
