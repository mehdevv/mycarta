import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SkipLink from "@/components/layout/skip-link";
import PageTransition from "@/components/layout/page-transition";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/lib/auth";

import { TenantProvider } from "@/lib/tenant-context";
import { DashboardTourProvider } from "@/lib/dashboard-tour-context";

import LandingPage from "@/pages/marketing/landing";
import PricingRedirect from "@/pages/marketing/pricing-redirect";
import SignupRedirect from "@/pages/public/signup-redirect";
import FindShop from "@/pages/public/find-shop";
import OnboardingRouteGate from "@/components/dashboard/onboarding-route-gate";
import DashboardBootScreen from "@/components/dashboard/dashboard-boot-screen";
import BillingPage from "@/pages/dashboard/billing";
import PlatformLayout from "@/components/layout/platform-layout";
import PlatformOverviewPage from "@/pages/platform/overview";
import PlatformTenantsPage from "@/pages/platform/tenants";
import PlatformTenantDetailPage from "@/pages/platform/tenant-detail";
import PlatformSubscriptionsPage from "@/pages/platform/subscriptions";
import PlatformPaymentsPage from "@/pages/platform/payments";
import PlatformAnalyticsPage from "@/pages/platform/analytics";
import PlatformAlertsPage from "@/pages/platform/alerts";
import PlatformSettingsPage from "@/pages/platform/settings";
import PlatformAccessDenied from "@/pages/platform/access-denied";
import Setup from "@/pages/public/setup";
import ShopAuthPage from "@/pages/public/shop-auth";
import EmployeeLogin from "@/pages/public/employee-login";
import ClientEnrol from "@/pages/public/client-enrol";
import Enrol from "@/pages/public/enrol";
import CardView from "@/pages/public/card";
import RewardClaim from "@/pages/public/reward-claim";

import DashboardLayout from "@/components/layout/dashboard-layout";
import WorkerLayout from "@/components/layout/worker-layout";
import OwnerActivationGate from "@/components/dashboard/owner-activation-gate";
import { useCurrentTenant } from "@/lib/tenant-context";

import DashboardOverview from "@/pages/dashboard/index";
import Workers from "@/pages/dashboard/workers";
import Clients from "@/pages/dashboard/clients";
import ClientProfile from "@/pages/dashboard/client-profile";
import Products from "@/pages/dashboard/products";
import Scans from "@/pages/dashboard/scans";
import Rewards from "@/pages/dashboard/rewards";
import Analytics from "@/pages/dashboard/analytics";
import FraudEvents from "@/pages/dashboard/fraud";
import Settings from "@/pages/dashboard/settings";
import CardEditorPage from "@/pages/dashboard/ccard";
import IntegrationsPage from "@/pages/dashboard/integrations";
import { INTEGRATIONS_LOCKED } from "@/lib/integration-tutorials";

import WorkerHome from "@/pages/worker/index";
import WorkerScan from "@/pages/worker/scan";
import WorkerHistory from "@/pages/worker/history";
import WorkerMyQr from "@/pages/worker/my-qr";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({
  component: Component,
  role,
  loginPath,
  loadingFallback,
}: {
  component: React.ComponentType;
  role: "owner" | "worker" | "super_admin";
  loginPath: string;
  loadingFallback?: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      loadingFallback ?? (
        <div className="flex h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
        </div>
      )
    );
  }

  if (!user) return <Redirect to={`~${loginPath}`} />;
  if (user.role !== role) {
    if (user.role === "super_admin") return <Redirect to="~/platform" />;
    if (user.role === "owner") return <Redirect to="~/dashboard" />;
    return <Redirect to="~/worker" />;
  }

  return <Component />;
}

function PlatformProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-white/30 border-t-white animate-spin" />
          <p className="text-sm text-slate-400">Chargement…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Redirect to="~/shop" />;
  if (user.role !== "super_admin") return <PlatformAccessDenied role={user.role} />;

  return (
    <PlatformLayout>
      <PageTransition>
        <Component />
      </PageTransition>
    </PlatformLayout>
  );
}

function WorkerProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { slug, isLoading } = useCurrentTenant();
  const loginPath = slug ? `/${slug}/employee` : "/employee";

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return <ProtectedRoute component={Component} role="worker" loginPath={loginPath} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/tarifs" component={PricingRedirect} />
      <Route path="/signup" component={SignupRedirect} />

      <Route path="/shop" component={ShopAuthPage} />
      <Route path="/admin">
        <Redirect to="~/shop" />
      </Route>
      <Route path="/login">
        <Redirect to="~/shop" />
      </Route>
      <Route path="/employee">
        <Redirect to="~/client" />
      </Route>
      <Route path="/emloyee">
        <Redirect to="~/client" />
      </Route>
      <Route path="/client" component={FindShop} />
      <Route path="/setup" component={Setup} />
      <Route path="/enrol" component={Enrol} />
      <Route path="/card/:code" component={CardView} />
      <Route path="/reward/:id" component={RewardClaim} />
      <Route path="/rewards/:code" component={RewardClaim} />

      <Route path="/platform" nest>
        <Switch>
          <Route path="/businesses/:id">
            <PlatformProtectedRoute component={PlatformTenantDetailPage} />
          </Route>
          <Route path="/businesses">
            <PlatformProtectedRoute component={PlatformTenantsPage} />
          </Route>
          <Route path="/subscriptions">
            <PlatformProtectedRoute component={PlatformSubscriptionsPage} />
          </Route>
          <Route path="/payments">
            <PlatformProtectedRoute component={PlatformPaymentsPage} />
          </Route>
          <Route path="/analytics">
            <PlatformProtectedRoute component={PlatformAnalyticsPage} />
          </Route>
          <Route path="/alerts">
            <PlatformProtectedRoute component={PlatformAlertsPage} />
          </Route>
          <Route path="/settings">
            <PlatformProtectedRoute component={PlatformSettingsPage} />
          </Route>
          <Route path="/">
            <PlatformProtectedRoute component={PlatformOverviewPage} />
          </Route>
        </Switch>
      </Route>

      <Route path="/dashboard/dashboard/:rest*">
        {(params) => <Redirect to={`~/dashboard/${params["rest*"] ?? ""}`} />}
      </Route>
      <Route path="/dashboard/login">
        <Redirect to="~/shop" />
      </Route>
      <Route path="/worker/worker/:rest*">
        {(params) => <Redirect to={`~/worker/${params["rest*"] ?? ""}`} />}
      </Route>
      <Route path="/worker/login">
        <Redirect to="~/employee" />
      </Route>

      <Route path="/dashboard/onboarding">
        <ProtectedRoute
          component={OnboardingRouteGate}
          role="owner"
          loginPath="/shop"
          loadingFallback={<DashboardBootScreen />}
        />
      </Route>

      <Route path="/dashboard" nest>
        <OwnerActivationGate>
          <DashboardLayout>
            <PageTransition>
              <Switch>
              <Route path="/shop">
                <Redirect to="~/shop" />
              </Route>
              <Route path="/login">
                <Redirect to="~/shop" />
              </Route>
              <Route path="/admin">
                <Redirect to="~/shop" />
              </Route>
              <Route path="/clients/:id">
                <ProtectedRoute component={ClientProfile} role="owner" loginPath="/shop" />
              </Route>
              <Route path="/clients">
                <ProtectedRoute component={Clients} role="owner" loginPath="/shop" />
              </Route>
              <Route path="/analytics">
                <ProtectedRoute component={Analytics} role="owner" loginPath="/shop" />
              </Route>
              <Route path="/fraud">
                <ProtectedRoute component={FraudEvents} role="owner" loginPath="/shop" />
              </Route>
              <Route path="/scans">
                <ProtectedRoute component={Scans} role="owner" loginPath="/shop" />
              </Route>
              <Route path="/rewards">
                <ProtectedRoute component={Rewards} role="owner" loginPath="/shop" />
              </Route>
              <Route path="/products">
                <ProtectedRoute component={Products} role="owner" loginPath="/shop" />
              </Route>
              <Route path="/contacts">
                <Redirect to="~/dashboard/clients" />
              </Route>
              <Route path="/workers">
                <ProtectedRoute component={Workers} role="owner" loginPath="/shop" />
              </Route>
              <Route path="/settings">
                <ProtectedRoute component={Settings} role="owner" loginPath="/shop" />
              </Route>
              <Route path="/ccard">
                <ProtectedRoute component={CardEditorPage} role="owner" loginPath="/shop" />
              </Route>
              <Route path="/integrations">
                {INTEGRATIONS_LOCKED ? (
                  <Redirect to="~/dashboard" />
                ) : (
                  <ProtectedRoute component={IntegrationsPage} role="owner" loginPath="/shop" />
                )}
              </Route>
              <Route path="/billing">
                <ProtectedRoute component={BillingPage} role="owner" loginPath="/shop" />
              </Route>
              <Route path="/">
                <ProtectedRoute component={DashboardOverview} role="owner" loginPath="/shop" />
              </Route>
            </Switch>
          </PageTransition>
        </DashboardLayout>
        </OwnerActivationGate>
      </Route>

      <Route path="/worker" nest>
        <WorkerLayout>
          <PageTransition>
            <Switch>
              <Route path="/scan">
                <WorkerProtectedRoute component={WorkerScan} />
              </Route>
              <Route path="/history">
                <WorkerProtectedRoute component={WorkerHistory} />
              </Route>
              <Route path="/my-qr">
                <WorkerProtectedRoute component={WorkerMyQr} />
              </Route>
              <Route path="/">
                <WorkerProtectedRoute component={WorkerHome} />
              </Route>
            </Switch>
          </PageTransition>
        </WorkerLayout>
      </Route>

      <Route path="/:slug/client" component={ClientEnrol} />
      <Route path="/:slug/employee" component={EmployeeLogin} />
      <Route path="/:slug/card/:code" component={CardView} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <TooltipProvider>
          <AuthProvider>
            <TenantProvider>
              <DashboardTourProvider>
              <SkipLink />
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
              </DashboardTourProvider>
            </TenantProvider>
          </AuthProvider>
        </TooltipProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}

export default App;
