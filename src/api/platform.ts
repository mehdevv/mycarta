import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
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
  ownerProfilePhone?: string | null;
  ownerPhone?: string | null;
  billingFullName?: string | null;
  billingPhone?: string | null;
  billingEmail?: string | null;
  assignedRepName?: string | null;
  affiliateName?: string | null;
  affiliateCodeUsed?: string | null;
  updatedAt?: string;
  planMonthlyDzd?: number | null;
}

export interface PlatformTenantClientRow {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  cardCode: string;
  cardUrl: string | null;
  totalStamps: number;
  currentCycleStamps: number;
  totalRewardsEarned: number;
  currentCycleSpendDzd?: number;
  totalSpendDzd?: number;
  isBlocked: boolean;
  notes: string | null;
  enrolledAt: string;
  lastScanAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformTenantScanRow {
  id: string;
  clientName: string | null;
  clientCardCode: string | null;
  workerName: string | null;
  scanType: string;
  status: string;
  blockReason: string | null;
  stampsAdded: number;
  spendAddedDzd?: number;
  purchaseAmountDzd: number | null;
  rewardTriggered: boolean;
  reviewNotes: string | null;
  scannedAt: string;
  createdAt: string;
}

export interface PlatformWorkerRow {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  scanCount: number;
}

export interface PlatformTenantDetail extends PlatformTenantRow {
  logoUrl?: string | null;
  updatedAt?: string;
  chargilyCustomerId?: string | null;
  planAnnualDzd?: number | null;
  planCampaignLimit?: number | null;
  planLocationLimit?: number | null;
  ownerPhone?: string | null;
  billing?: {
    fullName: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  } | null;
  salesRep?: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
  } | null;
  salesFollowUp?: {
    status: string;
    priority: string;
    notes: string | null;
    nextFollowUpAt: string | null;
    lastContactAt: string | null;
    upsellPlanId: string | null;
  } | null;
  affiliate?: {
    id: string;
    fullName: string;
    affiliateCode: string;
    socialHandle: string | null;
  } | null;
  affiliateCodeUsed?: string | null;
  affiliateFirstPaidAt?: string | null;
  affiliateBenefitEndsAt?: string | null;
  affiliateCommissionPaymentsCount?: number;
  totalRevenueApprovedDzd?: number;
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
  owner: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
    isActive?: boolean;
    createdAt?: string;
  } | null;
  workers?: (PlatformWorkerRow & { phone?: string | null; createdAt?: string })[];
  recentScans: {
    id: string;
    clientName: string | null;
    workerName?: string | null;
    status: string;
    blockReason?: string | null;
    stampsAdded: number;
    purchaseAmountDzd?: number | null;
    rewardTriggered?: boolean;
    scannedAt: string;
  }[];
  fraudScans?: {
    id: string;
    clientName: string | null;
    workerName?: string | null;
    status: string;
    blockReason?: string | null;
    scannedAt: string;
  }[];
  recentClients?: {
    id: string;
    fullName: string;
    phone?: string | null;
    email?: string | null;
    cardCode: string;
    totalStamps: number;
    currentCycleStamps?: number;
    totalRewardsEarned?: number;
    isBlocked?: boolean;
    enrolledAt: string;
    lastScanAt?: string | null;
  }[];
  products?: {
    id: string;
    name: string;
    sku: string | null;
    category: string | null;
    price: number;
    isActive: boolean;
    createdAt: string;
  }[];
  recentRewards?: {
    id: string;
    clientName: string;
    rewardDescription: string;
    redeemedAt: string | null;
    createdAt: string;
  }[];
  campaigns?: {
    id: string;
    name: string;
    channel: string;
    status: string;
    totalRecipients: number | null;
    totalSent: number | null;
    scheduledAt: string | null;
    sentAt: string | null;
    createdAt: string;
  }[];
  subscriptions: {
    id: string;
    planId: string;
    billingPeriod: string;
    status: string;
    amountDzd: number;
    startsAt: string | null;
    endsAt: string | null;
    chargilyCheckoutId?: string | null;
    chargilyPaymentId?: string | null;
    createdAt: string;
  }[];
  receipts: {
    id: string;
    planId: string;
    billingPeriod?: string;
    amountDzd: number;
    paymentMethod?: string;
    receiptUrl?: string;
    status: string;
    reviewerNotes?: string | null;
    reviewedAt?: string | null;
    createdAt: string;
  }[];
  salesCommissions?: {
    id: string;
    repName: string;
    planId: string;
    amountDzd: number;
    commissionDzd: number;
    commissionRate: number;
    status: string;
    createdAt: string;
  }[];
  affiliateCommissions?: {
    id: string;
    affiliateName: string;
    affiliateCode: string;
    planId: string;
    amountDzd: number;
    commissionDzd: number;
    commissionRate: number;
    paymentPeriod: number;
    status: string;
    createdAt: string;
  }[];
  shopSettings?: {
    businessName?: string;
    currency: string;
    timezone: string;
    clientLanguage: string;
    stampThreshold: number;
    maxScansPerDay: number;
    rewardType?: string;
    rewardValue?: string | null;
    rewardMode?: string;
    stampsEnabled?: boolean;
    spendEnabled?: boolean;
    spendThresholdDzd?: number;
    collectClientEmail?: boolean;
    trackProducts?: boolean;
    cardDesignId?: string;
    primaryColor?: string;
    secondaryColor?: string;
    whatsappConfigured: boolean;
    emailConfigured: boolean;
    createdAt?: string;
    updatedAt?: string;
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
  subscriptionExpiring7d?: number;
  subscriptionExpiring30d?: number;
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
  commission_rate_boutique: number;
  commission_rate_maison: number;
  commission_rate_prestige: number;
  affiliate_price_boutique_monthly: number;
  affiliate_price_boutique_annual: number;
  affiliate_price_maison_monthly: number;
  affiliate_price_maison_annual: number;
  affiliate_commission_rate_boutique: number;
  affiliate_commission_rate_maison: number;
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
  tenantClients: (id: string) => ["platform-tenant-clients", id] as const,
  tenantScans: (id: string) => ["platform-tenant-scans", id] as const,
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

const PAGE_SIZE = 200;

export function usePlatformTenantClients(tenantId?: string) {
  return useInfiniteQuery({
    queryKey: platformQueryKeys.tenantClients(tenantId ?? ""),
    enabled: !!tenantId,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc("get_platform_tenant_clients", {
        p_tenant_id: tenantId,
        p_limit: PAGE_SIZE,
        p_offset: pageParam,
      });
      if (error) throw error;
      return data as { total: number; limit: number; offset: number; items: PlatformTenantClientRow[] };
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((n, p) => n + p.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });
}

export function usePlatformTenantScans(tenantId?: string) {
  return useInfiniteQuery({
    queryKey: platformQueryKeys.tenantScans(tenantId ?? ""),
    enabled: !!tenantId,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc("get_platform_tenant_scans", {
        p_tenant_id: tenantId,
        p_limit: PAGE_SIZE,
        p_offset: pageParam,
      });
      if (error) throw error;
      return data as { total: number; limit: number; offset: number; items: PlatformTenantScanRow[] };
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((n, p) => n + p.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
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
          commission_rate_boutique: payload.commission_rate_boutique,
          commission_rate_maison: payload.commission_rate_maison,
          commission_rate_prestige: payload.commission_rate_prestige,
          affiliate_price_boutique_monthly: payload.affiliate_price_boutique_monthly,
          affiliate_price_boutique_annual: payload.affiliate_price_boutique_annual,
          affiliate_price_maison_monthly: payload.affiliate_price_maison_monthly,
          affiliate_price_maison_annual: payload.affiliate_price_maison_annual,
          affiliate_commission_rate_boutique: payload.affiliate_commission_rate_boutique,
          affiliate_commission_rate_maison: payload.affiliate_commission_rate_maison,
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
