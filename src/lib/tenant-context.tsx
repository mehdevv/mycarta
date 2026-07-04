import { createContext, useContext } from "react";
import { useGetCurrentTenant, useGetTrialStatus, type Tenant, type TrialStatus } from "@/api/tenant";
import { useAuth } from "@/lib/auth";

interface TenantContextValue {
  tenant: Tenant | null;
  trialStatus: TrialStatus | null;
  isLoading: boolean;
  slug: string | null;
  onboardingComplete: boolean;
  dashboardTutorialComplete: boolean;
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  trialStatus: null,
  isLoading: true,
  slug: null,
  onboardingComplete: false,
  dashboardTutorialComplete: false,
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { businessUser, workerUser, activeSlot } = useAuth();
  const user = activeSlot === "worker" ? workerUser : businessUser;
  const enabled =
    !!user &&
    user.role !== "super_admin" &&
    user.role !== "sales_rep" &&
    user.role !== "affiliate";

  const { data: tenant, isPending: tenantPending } = useGetCurrentTenant({ enabled });
  const { data: trialStatus, isPending: trialPending } = useGetTrialStatus({
    enabled: enabled && !!tenant,
  });

  return (
    <TenantContext.Provider
      value={{
        tenant: tenant ?? null,
        trialStatus: trialStatus ?? null,
        isLoading: enabled && (tenantPending || (!!tenant && trialPending)),
        slug: tenant?.slug ?? null,
        onboardingComplete: tenant?.onboardingComplete ?? false,
        dashboardTutorialComplete: tenant?.dashboardTutorialComplete ?? false,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useCurrentTenant() {
  return useContext(TenantContext);
}
