import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SkipLink from "@/components/layout/skip-link";
import PageTransition from "@/components/layout/page-transition";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/lib/auth";

import Setup from "@/pages/public/setup";
import AdminLogin from "@/pages/public/admin-login";
import EmployeeLogin from "@/pages/public/employee-login";
import ClientEnrol from "@/pages/public/client-enrol";
import Login from "@/pages/public/login";
import Enrol from "@/pages/public/enrol";
import CardView from "@/pages/public/card";
import RewardClaim from "@/pages/public/reward-claim";

import DashboardLayout from "@/components/layout/dashboard-layout";
import WorkerLayout from "@/components/layout/worker-layout";

import DashboardOverview from "@/pages/dashboard/index";
import Workers from "@/pages/dashboard/workers";
import Clients from "@/pages/dashboard/clients";
import ClientProfile from "@/pages/dashboard/client-profile";
import Products from "@/pages/dashboard/products";
import Scans from "@/pages/dashboard/scans";
import Rewards from "@/pages/dashboard/rewards";
import Analytics from "@/pages/dashboard/analytics";
import FraudEvents from "@/pages/dashboard/fraud";
import Contacts from "@/pages/dashboard/contacts";
import Settings from "@/pages/dashboard/settings";

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
}: {
  component: React.ComponentType;
  role: "owner" | "worker";
  loginPath: string;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Redirect to={`~${loginPath}`} />;
  if (user.role !== role) {
    return <Redirect to={user.role === "owner" ? "~/dashboard" : "~/worker"} />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/admin" component={AdminLogin} />
      <Route path="/employee" component={EmployeeLogin} />
      <Route path="/emloyee" component={EmployeeLogin} />
      <Route path="/client" component={ClientEnrol} />
      <Route path="/setup" component={Setup} />
      <Route path="/login" component={Login} />
      <Route path="/enrol" component={Enrol} />
      <Route path="/card/:code" component={CardView} />
      <Route path="/rewards/:code" component={RewardClaim} />

      <Route path="/dashboard/dashboard/:rest*">
        {(params) => <Redirect to={`~/dashboard/${params["rest*"] ?? ""}`} />}
      </Route>
      <Route path="/dashboard/login">
        <Redirect to="~/admin" />
      </Route>
      <Route path="/worker/worker/:rest*">
        {(params) => <Redirect to={`~/worker/${params["rest*"] ?? ""}`} />}
      </Route>
      <Route path="/worker/login">
        <Redirect to="~/employee" />
      </Route>

      <Route path="/dashboard" nest>
        <DashboardLayout>
          <PageTransition>
            <Switch>
              <Route path="/clients/:id">
                <ProtectedRoute component={ClientProfile} role="owner" loginPath="/admin" />
              </Route>
              <Route path="/clients">
                <ProtectedRoute component={Clients} role="owner" loginPath="/admin" />
              </Route>
              <Route path="/analytics">
                <ProtectedRoute component={Analytics} role="owner" loginPath="/admin" />
              </Route>
              <Route path="/fraud">
                <ProtectedRoute component={FraudEvents} role="owner" loginPath="/admin" />
              </Route>
              <Route path="/scans">
                <ProtectedRoute component={Scans} role="owner" loginPath="/admin" />
              </Route>
              <Route path="/rewards">
                <ProtectedRoute component={Rewards} role="owner" loginPath="/admin" />
              </Route>
              <Route path="/products">
                <ProtectedRoute component={Products} role="owner" loginPath="/admin" />
              </Route>
              <Route path="/contacts">
                <ProtectedRoute component={Contacts} role="owner" loginPath="/admin" />
              </Route>
              <Route path="/workers">
                <ProtectedRoute component={Workers} role="owner" loginPath="/admin" />
              </Route>
              <Route path="/settings">
                <ProtectedRoute component={Settings} role="owner" loginPath="/admin" />
              </Route>
              <Route path="/">
                <ProtectedRoute component={DashboardOverview} role="owner" loginPath="/admin" />
              </Route>
            </Switch>
          </PageTransition>
        </DashboardLayout>
      </Route>

      <Route path="/worker" nest>
        <WorkerLayout>
          <PageTransition>
            <Switch>
              <Route path="/scan">
                <ProtectedRoute component={WorkerScan} role="worker" loginPath="/employee" />
              </Route>
              <Route path="/history">
                <ProtectedRoute component={WorkerHistory} role="worker" loginPath="/employee" />
              </Route>
              <Route path="/my-qr">
                <ProtectedRoute component={WorkerMyQr} role="worker" loginPath="/employee" />
              </Route>
              <Route path="/">
                <ProtectedRoute component={WorkerHome} role="worker" loginPath="/employee" />
              </Route>
            </Switch>
          </PageTransition>
        </WorkerLayout>
      </Route>

      <Route path="/">
        <Redirect to="~/client" />
      </Route>

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
            <SkipLink />
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}

export default App;
