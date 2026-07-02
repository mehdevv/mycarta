import { useMutation, useQuery } from "@tanstack/react-query";
import { invokeFunction, supabase } from "@/lib/supabase";
import type { PlanId } from "@/lib/pricing";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  planId: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  onboardingComplete: boolean;
  dashboardTutorialComplete: boolean;
}

export interface TrialStatus {
  planId: string;
  planName: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  daysLeft: number;
  isActive: boolean;
  clientLimit: number | null;
  workerLimit: number | null;
  campaignLimit: number | null;
  locationLimit: number | null;
  scansPerDayLimit: number | null;
  scansTotalLimit: number | null;
}

export interface PlanUsage {
  clients: number;
  workers: number;
  campaignsThisMonth: number;
  scansToday: number;
  scansTotal: number;
  locations: number;
}

export const getTenantQueryKey = () => ["tenant"] as const;

export function useGetCurrentTenant(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: getTenantQueryKey(),
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
    queryFn: async (): Promise<Tenant | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id, role")
        .eq("id", user.id)
        .single();

      if (!profile?.tenant_id) return null;

      const { data: tenant, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", profile.tenant_id)
        .single();

      if (error || !tenant) return null;

      return {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        planId: tenant.plan_id,
        subscriptionStatus: tenant.subscription_status,
        trialEndsAt: tenant.trial_ends_at,
        subscriptionEndsAt: tenant.subscription_ends_at,
        onboardingComplete: Boolean(tenant.onboarding_complete),
        dashboardTutorialComplete: Boolean(tenant.dashboard_tutorial_complete),
      };
    },
  });
}

export function useGetTrialStatus(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["trial-status"],
    enabled: options?.enabled ?? true,
    queryFn: async (): Promise<TrialStatus | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.tenant_id) return null;

      const { data, error } = await supabase.rpc("get_trial_status", {
        p_tenant_id: profile.tenant_id,
      });

      if (error) throw error;
      if (!data) return null;

      const d = data as Record<string, unknown>;
      return {
        planId: String(d.planId ?? ""),
        planName: String(d.planName ?? ""),
        subscriptionStatus: String(d.subscriptionStatus ?? ""),
        trialEndsAt: (d.trialEndsAt as string) ?? null,
        subscriptionEndsAt: (d.subscriptionEndsAt as string) ?? null,
        daysLeft: Number(d.daysLeft ?? 0),
        isActive: Boolean(d.isActive),
        clientLimit: d.clientLimit != null ? Number(d.clientLimit) : null,
        workerLimit: d.workerLimit != null ? Number(d.workerLimit) : null,
        campaignLimit: d.campaignLimit != null ? Number(d.campaignLimit) : null,
        locationLimit: d.locationLimit != null ? Number(d.locationLimit) : null,
        scansPerDayLimit: d.scansPerDayLimit != null ? Number(d.scansPerDayLimit) : null,
        scansTotalLimit: d.scansTotalLimit != null ? Number(d.scansTotalLimit) : null,
      };
    },
  });
}

export function useGetTenantBySlug(slug?: string) {
  return useQuery({
    queryKey: ["tenant-slug", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_tenant_by_slug", { p_slug: slug });
      if (error) throw error;
      return data as Record<string, unknown> | null;
    },
  });
}

export function useGetPlanUsage(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["plan-usage"],
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
    queryFn: async (): Promise<PlanUsage | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.tenant_id) return null;

      const tenantId = profile.tenant_id;
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);

      const [clientsRes, workersRes, scansTodayRes, scansTotalRes, campaignsRes] = await Promise.all([
        supabase
          .from("clients")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("role", "worker")
          .eq("is_active", true),
        supabase
          .from("scan_logs")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("status", "approved")
          .eq("scan_type", "purchase")
          .gte("scanned_at", dayStart.toISOString()),
        supabase
          .from("scan_logs")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("status", "approved")
          .eq("scan_type", "purchase"),
        supabase
          .from("campaigns")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .gte("created_at", monthStart.toISOString()),
      ]);

      return {
        clients: clientsRes.count ?? 0,
        workers: workersRes.count ?? 0,
        campaignsThisMonth: campaignsRes.error ? 0 : (campaignsRes.count ?? 0),
        scansToday: scansTodayRes.count ?? 0,
        scansTotal: scansTotalRes.count ?? 0,
        locations: 1,
      };
    },
  });
}

export function useRegisterTenant() {
  return useMutation({
    mutationFn: async (payload: {
      businessName: string;
      fullName: string;
      email: string;
      password: string;
      slug: string;
      selectedPlan: string;
    }) => {
      return invokeFunction<{ success: boolean; slug: string; tenantId: string }>(
        "register-tenant",
        payload,
      );
    },
  });
}

export function useCreateChargilyCheckout() {
  return useMutation({
    mutationFn: async (payload: { planId: PlanId; billingPeriod: "monthly" | "annual" }) => {
      return invokeFunction<{ checkoutUrl: string }>("create-chargily-checkout", payload);
    },
  });
}

export function useSubmitPaymentReceipt() {
  return useMutation({
    mutationFn: async (payload: {
      planId: PlanId;
      billingPeriod: "monthly" | "annual";
      amountDzd: number;
      receiptUrl: string;
      paymentMethod: "baridimob" | "ccp" | "cib" | "cash";
    }) => {
      return invokeFunction("submit-payment-receipt", payload);
    },
  });
}

export function useGetPlatformBankDetails() {
  return useQuery({
    queryKey: ["platform-bank"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("bank_details")
        .eq("id", "default")
        .single();
      if (error) throw error;
      return data.bank_details as string;
    },
  });
}

export interface PaymentReceipt {
  id: string;
  plan_id: string;
  billing_period: string;
  amount_dzd: number;
  status: string;
  created_at: string;
  reviewer_notes: string | null;
}

export interface TenantSubscription {
  id: string;
  plan_id: string;
  billing_period: string;
  status: string;
  amount_dzd: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export function useGetTenantPaymentReceipts(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["tenant-receipts"],
    enabled: options?.enabled ?? true,
    queryFn: async (): Promise<PaymentReceipt[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from("payment_receipts")
        .select("id, plan_id, billing_period, amount_dzd, status, created_at, reviewer_notes")
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as PaymentReceipt[];
    },
  });
}

export function useGetTenantSubscriptions(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["tenant-subscriptions"],
    enabled: options?.enabled ?? true,
    queryFn: async (): Promise<TenantSubscription[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from("subscriptions")
        .select("id, plan_id, billing_period, status, amount_dzd, starts_at, ends_at, created_at")
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data ?? []) as TenantSubscription[];
    },
  });
}

export function useCancelSubscription() {
  return useMutation({
    mutationFn: async () => {
      return invokeFunction<{ success: boolean; accessUntil: string | null }>(
        "cancel-subscription",
        {},
      );
    },
  });
}

export function useDeleteTenantAccount() {
  return useMutation({
    mutationFn: async (payload: { password: string; confirmSlug: string }) => {
      return invokeFunction<{ success: boolean }>("delete-tenant-account", payload);
    },
  });
}

export function useListPaymentReceiptsAdmin() {
  return useQuery({
    queryKey: ["admin-receipts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_receipts")
        .select("*, tenants(name, slug)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useListTenantsAdmin() {
  return useQuery({
    queryKey: ["admin-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*, plans(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useReviewPaymentReceipt() {
  return useMutation({
    mutationFn: async (payload: {
      receiptId: string;
      action: "approve" | "reject";
      notes?: string;
    }) => {
      return invokeFunction("review-payment-receipt", payload);
    },
  });
}

export function useOverrideTenantPlan() {
  return useMutation({
    mutationFn: async (payload: {
      tenantId: string;
      planId: PlanId;
      subscriptionEndsAt?: string;
    }) => {
      return invokeFunction("override-tenant-plan", payload);
    },
  });
}

async function getOwnerTenantId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner" || !profile.tenant_id) {
    throw new Error("Accès refusé");
  }

  return profile.tenant_id;
}

export function useCompleteOnboarding() {
  return useMutation({
    mutationFn: async (payload?: { logoUrl?: string | null; brandColor?: string }) => {
      const tenantId = await getOwnerTenantId();
      const updates: Record<string, unknown> = { onboarding_complete: true };
      if (payload?.logoUrl !== undefined) updates.logo_url = payload.logoUrl;
      if (payload?.brandColor) updates.brand_color = payload.brandColor;

      const { error } = await supabase.from("tenants").update(updates).eq("id", tenantId);
      if (error) throw error;
    },
  });
}

export function useCompleteDashboardTutorial() {
  return useMutation({
    mutationFn: async () => {
      const tenantId = await getOwnerTenantId();
      const { error } = await supabase
        .from("tenants")
        .update({ dashboard_tutorial_complete: true })
        .eq("id", tenantId);
      if (error) throw error;
    },
  });
}

export function useResetDashboardTutorial() {
  return useMutation({
    mutationFn: async () => {
      const tenantId = await getOwnerTenantId();
      const { error } = await supabase
        .from("tenants")
        .update({ dashboard_tutorial_complete: false })
        .eq("id", tenantId);
      if (error) throw error;
    },
  });
}
