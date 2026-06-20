import { Redirect } from "wouter";
import { useCurrentTenant } from "@/lib/tenant-context";
import OnboardingPage from "@/pages/dashboard/onboarding";
import DashboardBootScreen from "@/components/dashboard/dashboard-boot-screen";

/** Only mount the onboarding wizard once we know setup is still required. */
export default function OnboardingRouteGate() {
  const { isLoading, onboardingComplete } = useCurrentTenant();

  if (isLoading) {
    return <DashboardBootScreen />;
  }

  if (onboardingComplete) {
    return <Redirect to="/dashboard" replace />;
  }

  return <OnboardingPage />;
}
