import { Link, useLocation } from "wouter";
import { Button } from "@heroui/react";
import { LogOut, Home, QrCode, History } from "lucide-react";
import Mascot from "@/components/brand/mascot";
import { useAuth } from "@/lib/auth";
import { useLogout } from "@/api";

const tabs = [
  { path: "/", label: "Home", icon: Home },
  { path: "/scan", label: "Scan", icon: QrCode, primary: true },
  { path: "/history", label: "History", icon: History },
  { path: "/my-qr", label: "My QR", icon: QrCode },
];

function workerPath(path: string) {
  return path === "/" ? "/worker" : `/worker${path}`;
}

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { logout } = useAuth();
  const logoutMutation = useLogout();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      logout();
      setLocation("~/employee");
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <header className="h-14 border-b border-border bg-card flex items-center gap-2 px-4 sticky top-0 z-10 shrink-0 shadow-sm">
        <Mascot role="employee" size="xs" animate={false} />
        <h1 className="text-lg font-bold text-primary tracking-tight">LoyalQR Scanner</h1>
        <div className="ml-auto">
          <Button
            variant="ghost"
            className="min-h-12 min-w-12 text-muted-foreground"
            onPress={handleLogout}
            aria-label="Logout"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </header>

      <main id="main-content" className="flex-1 flex flex-col w-full max-w-lg mx-auto relative overflow-hidden pb-20">
        {children}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 h-[4.5rem] bg-card border-t border-border flex items-center justify-around px-2 z-50 safe-area-pb"
        aria-label="Worker navigation"
      >
        {tabs.map((tab) => {
          const active = location === workerPath(tab.path);
          if (tab.primary) {
            return (
              <Link
                key={tab.path}
                href={tab.path}
                className="flex flex-col items-center justify-center min-h-12 min-w-12 -mt-4"
                aria-label={tab.label}
              >
                <div
                  className={`h-14 w-14 rounded-full flex items-center justify-center shadow-lg ring-4 ring-background ${
                    active ? "bg-primary text-white" : "bg-primary/90 text-white"
                  }`}
                >
                  <tab.icon className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-medium mt-1 text-primary">{tab.label}</span>
              </Link>
            );
          }
          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={`flex flex-col items-center justify-center min-h-12 min-w-12 gap-0.5 ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
              aria-label={tab.label}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
