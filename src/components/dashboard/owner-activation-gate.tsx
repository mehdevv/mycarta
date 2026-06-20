import { Redirect } from "wouter";
import { useCurrentTenant } from "@/lib/tenant-context";
import DashboardBootScreen from "@/components/dashboard/dashboard-boot-screen";

export default function OwnerActivationGate({ children }: { children: React.ReactNode }) {
  const { isLoading, onboardingComplete } = useCurrentTenant();

  if (isLoading) {
    return <DashboardBootScreen />;
  }

  if (!onboardingComplete) {
    return <Redirect to="/dashboard/onboarding" replace />;
  }

  return <>{children}</>;
}
