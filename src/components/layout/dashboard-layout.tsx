import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button, Drawer } from "@heroui/react";
import {
  Users,
  LayoutDashboard,
  Settings,
  Gift,
  QrCode,
  LogOut,
  Package,
  BarChart3,
  Contact,
  ShieldAlert,
  Menu,
} from "lucide-react";
import Mascot from "@/components/brand/mascot";
import { APP_NAME } from "@/lib/app-name";
import { useAuth } from "@/lib/auth";
import { useLogout, useGetSettings } from "@/api";

const navItems = [
  { label: "Overview", path: "/", icon: LayoutDashboard },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
  { label: "Clients", path: "/clients", icon: Users },
  { label: "Contacts", path: "/contacts", icon: Contact },
  { label: "Scans", path: "/scans", icon: QrCode },
  { label: "Fraud", path: "/fraud", icon: ShieldAlert },
  { label: "Rewards", path: "/rewards", icon: Gift },
  { label: "Products", path: "/products", icon: Package },
  { label: "Workers", path: "/workers", icon: Users },
  { label: "Settings", path: "/settings", icon: Settings },
];

function dashboardPath(path: string) {
  return path === "/" ? "/dashboard" : `/dashboard${path}`;
}

function NavLinks({
  location,
  onNavigate,
}: {
  location: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1 p-2">
      {navItems.map((item) => {
        const href = item.path;
        const active = location === dashboardPath(item.path);
        return (
          <Link
            key={item.path}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-primary text-white"
                : "text-foreground hover:bg-muted"
            }`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout, user } = useAuth();
  const logoutMutation = useLogout();
  const { data: settings } = useGetSettings();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      logout();
      setLocation("~/admin");
    }
  };

  const brand = (
    <div className="flex items-center gap-3 p-4 border-b border-border">
      <Mascot role="admin" size="sm" animate={false} />
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-primary tracking-tight truncate">
          {settings?.businessName ?? APP_NAME}
        </h2>
        <p className="text-xs text-muted-foreground">Admin dashboard</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-muted/20">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-card">
        {brand}
        <div className="flex-1 overflow-y-auto">
          <NavLinks location={location} />
        </div>
        <div className="p-2 border-t border-border">
          <Button
            variant="ghost"
            fullWidth
            className="justify-start text-destructive"
            onPress={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
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
              <Drawer.Body className="p-0">
                {brand}
                <NavLinks location={location} onNavigate={() => setMobileOpen(false)} />
              </Drawer.Body>
              <Drawer.Footer>
                <Button variant="ghost" fullWidth onPress={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </Drawer.Footer>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-card flex items-center px-4 md:px-6 sticky top-0 z-10 shrink-0">
          <Button
            variant="ghost"
            className="lg:hidden -ml-1 mr-2 min-h-10 min-w-10"
            onPress={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm font-medium text-foreground">{user?.fullName}</span>
          </div>
        </header>
        <main id="main-content" className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
