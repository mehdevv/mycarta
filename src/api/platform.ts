import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { PlanId } from "@/lib/pricing";
import { invokeFunction } from "@/lib/supabase";

export interface DayCount {
  date: string;
  count: number;
}

export interface DayRevenue {
  date: string;
  amountDzd: number;
}

export interface MrrByPlan {
  planId: string;
  planName: string;
  tenantCount: number;
  mrrDzd: number;
}

export interface PlatformOverview {
  totalTenants: number;
  trialingTenants: number;
  activeTenants: number;
  pastDueTenants?: number;
  canceledTenants?: number;
  expiredTenants: number;
  newTenantsToday?: number;
  newTenantsThisWeek?: number;
  newTenantsThisMonth?: number;
  trialExpiring7d?: number;
  onboardingCompleteCount?: number;
  tutorialCompleteCount?: number;
  totalClients: number;
  activeCards?: number;
  blockedCards?: number;
  clientsEnrolledToday?: number;
  clientsEnrolledThisWeek?: number;
  clientsEnrolledThisMonth?: number;
  totalScans: number;
  scansToday: number;
  scansThisWeek: number;
  scansThisMonth?: number;
  fraudScansTotal?: number;
  fraudScansToday?: number;
  totalRewards: number;
  rewardsRedeemed?: number;
  rewardsPending?: number;
  totalWorkers?: number;
  activeWorkers?: number;
  totalOwners?: number;
  totalProducts?: number;
  activeProducts?: number;
  totalCampaigns?: number;
  pendingReceipts: number;
  approvedReceipts?: number;
  rejectedReceipts?: number;
  activeSubscriptions: number;
  pendingSubscriptions?: number;
  estimatedMrrDzd: number;
  estimatedArrDzd?: number;
  revenueApprovedTotalDzd?: number;
  revenueApprovedThisMonthDzd?: number;
  chargilyPaymentsCount?: number;
  baridimobPaymentsCount?: number;
  avgClientsPerTenant?: number;
  avgScansPerTenant?: number;
  avgWorkersPerTenant?: number;
  onboardingRate?: number;
  trialToPaidRate?: number;
  fraudRate?: number;
  rewardRedemptionRate?: number;
  monthlyChurnCount?: number;
  tenantsByPlan: Record<string, number>;
  tenantsByStatus?: Record<string, number>;
  mrrByPlan?: MrrByPlan[];
  signupsByDay: DayCount[];
  scansByDay: DayCount[];
  enrolmentsByDay?: DayCount[];
  revenueByDay?: DayRevenue[];
}

export interface PlatformTenantRow {
  id: string;
  slug: string;
  name: string;
  planId: string;
  planName: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  onboardingComplete: boolean;
  dashboardTutorialComplete?: boolean;
  createdAt: string;
  clientCount: number;
  activeCardCount?: number;
  scanCount: number;
  fraudScanCount?: number;
  workerCount: number;
  rewardCount?: number;
  rewardsPending?: number;
  productCount?: number;
  campaignCount?: number;
  newClients7d?: number;
  lastScanAt?: string | null;
  lastEnrolmentAt?: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
  planMonthlyDzd?: number | null;
}

export interface PlatformWorkerRow {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  scanCount: number;
}

export interface PlatformTenantDetail extends PlatformTenantRow {
  planMonthlyDzd?: number | null;
  planClientLimit?: number | null;
  planWorkerLimit?: number | null;
  blockedCardCount?: number;
  newClients7d?: number;
  newClients30d?: number;
  fraudScanCount?: number;
  scansToday: number;
  scansThisWeek?: number;
  scansThisMonth?: number;
  inactiveWorkerCount?: number;
  rewardsRedeemed?: number;
  totalStampsIssued?: number;
  lastScanAt?: string | null;
  lastEnrolmentAt?: string | null;
  brandColor?: string;
  owner: { id: string; fullName: string; email: string; isActive?: boolean } | null;
  workers?: PlatformWorkerRow[];
  recentScans: {
    id: string;
    clientName: string | null;
    workerName?: string | null;
    status: string;
    stampsAdded: number;
    rewardTriggered?: boolean;
    scannedAt: string;
  }[];
  recentClients?: {
    id: string;
    fullName: string;
    cardCode: string;
    totalStamps: number;
    enrolledAt: string;
  }[];
  subscriptions: {
    id: string;
    planId: string;
    billingPeriod: string;
    status: string;
    amountDzd: number;
    startsAt: string | null;
    endsAt: string | null;
    chargilyPaymentId?: string | null;
    createdAt: string;
  }[];
  receipts: {
    id: string;
    planId: string;
    amountDzd: number;
    paymentMethod?: string;
    status: string;
    createdAt: string;
  }[];
  shopSettings?: {
    currency: string;
    timezone: string;
    clientLanguage: string;
    stampThreshold: number;
    maxScansPerDay: number;
    whatsappConfigured: boolean;
    emailConfigured: boolean;
  } | null;
}

export interface PlatformAnalytics {
  topByClients: { tenantId: string; name: string; slug: string; value: number }[];
  topByScans: { tenantId: string; name: string; slug: string; value: number }[];
  topByGrowth7d: { tenantId: string; name: string; slug: string; value: number }[];
  topByRevenue: { tenantId: string; name: string; slug: string; value: number }[];
  workerLeaderboard: { workerId: string; workerName: string; tenantName: string; scanCount: number }[];
  planEconomics: {
    planId: string;
    planName: string;
    tenantCount: number;
    activeCount: number;
    monthlyPriceDzd: number | null;
    mrrDzd: number;
  }[];
  healthScores: {
    tenantId: string;
    name: string;
    slug: string;
    clientCount: number;
    scanCount30d: number;
    daysSinceLastScan: number | null;
    onboardingComplete: boolean;
    subscriptionStatus: string;
  }[];
}

export interface PlatformAlertItem {
  type: string;
  priority: number;
  tenantId?: string;
  tenantName?: string;
  tenantSlug?: string;
  receiptId?: string;
  message: string;
  trialEndsAt?: string;
  amountDzd?: number;
  createdAt?: string;
  daysSinceLastScan?: number | null;
}

export interface PlatformAlerts {
  trialExpiring3d: number;
  trialExpiring7d: number;
  pendingReceiptsOver48h: number;
  inactiveTenants14d: number;
  items: PlatformAlertItem[];
}

export interface PlatformAuditEntry {
  id: string;
  action: string;
  meta: Record<string, unknown>;
  createdAt: string;
  targetTenantId: string | null;
  targetTenantName: string | null;
  actorName: string | null;
  actorEmail: string | null;
}

export interface PlatformSettingsRow {
  id: string;
  bank_details: string;
  support_email: string;
  maintenance_enabled: boolean;
  maintenance_banner: string;
  updated_at: string;
}

export interface PlatformSubscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  billing_period: string;
  status: string;
  amount_dzd: number;
  starts_at: string | null;
  ends_at: string | null;
  chargily_checkout_id: string | null;
  chargily_payment_id: string | null;
  created_at: string;
  tenants: { name: string; slug: string } | null;
  plans: { name: string } | null;
}

export interface PlatformReceipt {
  id: string;
  tenant_id: string;
  plan_id: string;
  billing_period: string;
  amount_dzd: number;
  receipt_url: string;
  payment_method: string;
  status: string;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  tenants: { name: string; slug: string } | null;
}

export type PlatformTenantAction =
  | "suspend"
  | "extend_trial"
  | "reset_onboarding"
  | "cancel_subscription"
  | "delete_tenant"
  | "delete_subscription";

export const platformQueryKeys = {
  overview: ["platform-overview"] as const,
  tenants: ["platform-tenants"] as const,
  tenant: (id: string) => ["platform-tenant", id] as const,
  analytics: ["platform-analytics"] as const,
  alerts: ["platform-alerts"] as const,
  audit: ["platform-audit"] as const,
  settings: ["platform-settings"] as const,
  subscriptions: ["platform-subscriptions"] as const,
  receipts: (status?: string) => ["platform-receipts", status ?? "all"] as const,
};

function invalidatePlatform(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: platformQueryKeys.overview });
  queryClient.invalidateQueries({ queryKey: platformQueryKeys.tenants });
  queryClient.invalidateQueries({ queryKey: platformQueryKeys.analytics });
  queryClient.invalidateQueries({ queryKey: platformQueryKeys.alerts });
  queryClient.invalidateQueries({ queryKey: platformQueryKeys.audit });
  queryClient.invalidateQueries({ queryKey: platformQueryKeys.subscriptions });
  queryClient.invalidateQueries({ queryKey: platformQueryKeys.receipts() });
}

export function usePlatformOverview() {
  return useQuery({
    queryKey: platformQueryKeys.overview,
    queryFn: async (): Promise<PlatformOverview> => {
      const { data, error } = await supabase.rpc("get_platform_overview");
      if (error) throw error;
      return data as PlatformOverview;
    },
  });
}

export function usePlatformTenants() {
  return useQuery({
    queryKey: platformQueryKeys.tenants,
    queryFn: async (): Promise<PlatformTenantRow[]> => {
      const { data, error } = await supabase.rpc("get_platform_tenants");
      if (error) throw error;
      return (data ?? []) as PlatformTenantRow[];
    },
  });
}

export function usePlatformTenantDetail(tenantId?: string) {
  return useQuery({
    queryKey: platformQueryKeys.tenant(tenantId ?? ""),
    enabled: !!tenantId,
    queryFn: async (): Promise<PlatformTenantDetail | null> => {
      const { data, error } = await supabase.rpc("get_platform_tenant_detail", {
        p_tenant_id: tenantId,
      });
      if (error) throw error;
      return data as PlatformTenantDetail | null;
    },
  });
}

export function usePlatformAnalytics() {
  return useQuery({
    queryKey: platformQueryKeys.analytics,
    queryFn: async (): Promise<PlatformAnalytics> => {
      const { data, error } = await supabase.rpc("get_platform_analytics");
      if (error) throw error;
      return data as PlatformAnalytics;
    },
  });
}

export function usePlatformAlerts() {
  return useQuery({
    queryKey: platformQueryKeys.alerts,
    queryFn: async (): Promise<PlatformAlerts> => {
      const { data, error } = await supabase.rpc("get_platform_alerts");
      if (error) throw error;
      return data as PlatformAlerts;
    },
  });
}

export function usePlatformAuditLog(limit = 50) {
  return useQuery({
    queryKey: [...platformQueryKeys.audit, limit],
    queryFn: async (): Promise<PlatformAuditEntry[]> => {
      const { data, error } = await supabase.rpc("get_platform_audit_log", { p_limit: limit });
      if (error) throw error;
      return (data ?? []) as PlatformAuditEntry[];
    },
  });
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: platformQueryKeys.settings,
    queryFn: async (): Promise<PlatformSettingsRow> => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .eq("id", "default")
        .single();
      if (error) throw error;
      return data as PlatformSettingsRow;
    },
  });
}

export function usePlatformSubscriptions() {
  return useQuery({
    queryKey: platformQueryKeys.subscriptions,
    queryFn: async (): Promise<PlatformSubscription[]> => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, tenants(name, slug), plans(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PlatformSubscription[];
    },
  });
}

export function usePlatformReceipts(status?: "pending" | "approved" | "rejected" | "all") {
  return useQuery({
    queryKey: platformQueryKeys.receipts(status),
    queryFn: async (): Promise<PlatformReceipt[]> => {
      let q = supabase
        .from("payment_receipts")
        .select("*, tenants(name, slug)")
        .order("created_at", { ascending: false });
      if (status && status !== "all") {
        q = q.eq("status", status);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PlatformReceipt[];
    },
  });
}

export function useUpdatePlatformSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<PlatformSettingsRow>) => {
      const { error } = await supabase
        .from("platform_settings")
        .update({
          bank_details: payload.bank_details,
          support_email: payload.support_email,
          maintenance_enabled: payload.maintenance_enabled,
          maintenance_banner: payload.maintenance_banner,
          updated_at: new Date().toISOString(),
        })
        .eq("id", "default");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformQueryKeys.settings });
      queryClient.invalidateQueries({ queryKey: ["platform-bank"] });
    },
  });
}

export function useReviewPaymentReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      receiptId: string;
      action: "approve" | "reject";
      notes?: string;
    }) => invokeFunction("review-payment-receipt", payload),
    onSuccess: () => invalidatePlatform(queryClient),
  });
}

export function useOverrideTenantPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      tenantId: string;
      planId: PlanId;
      subscriptionEndsAt?: string;
    }) => invokeFunction("override-tenant-plan", payload),
    onSuccess: (_, vars) => {
      invalidatePlatform(queryClient);
      queryClient.invalidateQueries({ queryKey: platformQueryKeys.tenant(vars.tenantId) });
    },
  });
}

export function usePlatformTenantAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      tenantId?: string;
      action: PlatformTenantAction;
      days?: number;
      confirmSlug?: string;
      subscriptionId?: string;
    }) => invokeFunction("platform-tenant-action", payload),
    onSuccess: (_, vars) => {
      invalidatePlatform(queryClient);
      if (vars.action === "delete_subscription") {
        queryClient.invalidateQueries({ queryKey: platformQueryKeys.subscriptions });
      }
      if (vars.tenantId) {
        queryClient.invalidateQueries({ queryKey: platformQueryKeys.tenant(vars.tenantId) });
      }
    },
  });
}

export function useDeletePlatformSubscription() {
  const mutation = usePlatformTenantAction();
  return {
    ...mutation,
    mutateAsync: (subscriptionId: string, tenantId?: string) =>
      mutation.mutateAsync({ action: "delete_subscription", subscriptionId, tenantId }),
  };
}
