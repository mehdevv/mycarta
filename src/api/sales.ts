import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invokeFunction, supabase } from "@/lib/supabase";

export interface SalesRepRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  tenant_count: number;
  pending_commission_dzd: number;
}

export interface PipelineItem {
  tenant_id: string;
  slug: string;
  business_name: string;
  plan_id: string;
  subscription_status: string;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  owner_phone: string | null;
  billing_full_name: string | null;
  billing_phone: string | null;
  billing_email: string | null;
  onboarding_complete: boolean;
  tenant_created_at: string;
  rep_id: string;
  owner_name: string | null;
  owner_email: string | null;
  owner_profile_phone: string | null;
  follow_up_id: string | null;
  status: string;
  priority: string;
  next_follow_up_at: string | null;
  last_contact_at: string | null;
  notes: string | null;
  upsell_plan_id: string | null;
  /** @deprecated use days_left */
  urgency_days?: number | null;
  days_left: number | null;
  access_type: string;
  access_ends_at: string | null;
  client_count: number;
  worker_count: number;
  new_clients_7d: number;
  scans_7d: number;
  scans_today: number;
  last_scan_at: string | null;
  active_subscription_id: string | null;
  active_sub_plan_id: string;
  active_sub_billing_period: string | null;
  active_sub_amount_dzd: number | null;
  active_sub_ends_at: string | null;
  active_sub_starts_at: string | null;
  pending_commission_dzd: number;
}

export interface CommissionRow {
  id: string;
  rep_id: string;
  tenant_id: string;
  subscription_id: string | null;
  plan_id: string;
  amount_dzd: number;
  commission_rate: number;
  commission_dzd: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  business_name: string;
  slug: string;
}

export const salesQueryKeys = {
  reps: ["sales-reps"] as const,
  pipeline: ["sales-pipeline"] as const,
  commissions: ["sales-commissions"] as const,
  assignableTenants: ["assignable-tenants"] as const,
};

export interface AssignableTenant {
  id: string;
  name: string;
  slug: string;
  planId: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  assignedSalesRepId: string | null;
  assignedRepName: string | null;
}

export function useAssignableTenants() {
  return useQuery({
    queryKey: salesQueryKeys.assignableTenants,
    queryFn: async (): Promise<AssignableTenant[]> => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, slug, plan_id, subscription_status, trial_ends_at, subscription_ends_at, assigned_sales_rep_id")
        .in("subscription_status", ["trialing", "active"])
        .order("name");

      if (error) throw error;

      const repIds = [
        ...new Set(
          (data ?? [])
            .map((t) => t.assigned_sales_rep_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ];

      const repMap = new Map<string, string>();
      if (repIds.length > 0) {
        const { data: reps } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", repIds);
        for (const rep of reps ?? []) {
          repMap.set(rep.id, rep.full_name);
        }
      }

      return (data ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        planId: t.plan_id,
        subscriptionStatus: t.subscription_status,
        trialEndsAt: t.trial_ends_at,
        subscriptionEndsAt: t.subscription_ends_at,
        assignedSalesRepId: t.assigned_sales_rep_id,
        assignedRepName: t.assigned_sales_rep_id
          ? repMap.get(t.assigned_sales_rep_id) ?? null
          : null,
      }));
    },
  });
}

export function useSalesReps() {
  return useQuery({
    queryKey: salesQueryKeys.reps,
    queryFn: async (): Promise<SalesRepRow[]> => {
      const { data, error } = await supabase.rpc("list_sales_reps");
      if (error) throw error;
      return (data ?? []) as SalesRepRow[];
    },
  });
}

export function useCreateSalesRep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      fullName: string;
      email: string;
      phone: string;
      password: string;
    }) => {
      return invokeFunction<{ success: boolean }>("create-sales-rep", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.reps });
    },
  });
}

export function useToggleSalesRepActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { repId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: payload.isActive, updated_at: new Date().toISOString() })
        .eq("id", payload.repId)
        .eq("role", "sales_rep");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.reps });
    },
  });
}

export function useAssignTenantSalesRep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { tenantId: string; repId: string | null }) => {
      const { data, error } = await supabase.rpc("assign_tenant_sales_rep", {
        p_tenant_id: payload.tenantId,
        p_rep_id: payload.repId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.reps });
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.pipeline });
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.assignableTenants });
      queryClient.invalidateQueries({ queryKey: ["tenant-assigned-rep", variables.tenantId] });
    },
  });
}

export function useSalesPipeline() {
  return useQuery({
    queryKey: salesQueryKeys.pipeline,
    queryFn: async (): Promise<PipelineItem[]> => {
      const { data, error } = await supabase.rpc("get_sales_rep_pipeline");
      if (error) throw error;
      return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
        tenant_id: String(row.tenant_id),
        slug: String(row.slug),
        business_name: String(row.business_name),
        plan_id: String(row.plan_id),
        subscription_status: String(row.subscription_status),
        trial_ends_at: (row.trial_ends_at as string) ?? null,
        subscription_ends_at: (row.subscription_ends_at as string) ?? null,
        owner_phone: (row.owner_phone as string) ?? null,
        billing_full_name: (row.billing_full_name as string) ?? null,
        billing_phone: (row.billing_phone as string) ?? null,
        billing_email: (row.billing_email as string) ?? null,
        onboarding_complete: Boolean(row.onboarding_complete),
        tenant_created_at: String(row.tenant_created_at ?? ""),
        rep_id: String(row.rep_id),
        owner_name: (row.owner_name as string) ?? null,
        owner_email: (row.owner_email as string) ?? null,
        owner_profile_phone: (row.owner_profile_phone as string) ?? null,
        follow_up_id: (row.follow_up_id as string) ?? null,
        status: String(row.status ?? "new"),
        priority: String(row.priority ?? "normal"),
        next_follow_up_at: (row.next_follow_up_at as string) ?? null,
        last_contact_at: (row.last_contact_at as string) ?? null,
        notes: (row.notes as string) ?? null,
        upsell_plan_id: (row.upsell_plan_id as string) ?? null,
        days_left: row.days_left != null ? Number(row.days_left) : row.urgency_days != null ? Number(row.urgency_days) : null,
        access_type: String(row.access_type ?? row.subscription_status ?? "unknown"),
        access_ends_at: (row.access_ends_at as string) ?? null,
        client_count: Number(row.client_count ?? 0),
        worker_count: Number(row.worker_count ?? 0),
        new_clients_7d: Number(row.new_clients_7d ?? 0),
        scans_7d: Number(row.scans_7d ?? 0),
        scans_today: Number(row.scans_today ?? 0),
        last_scan_at: (row.last_scan_at as string) ?? null,
        active_subscription_id: (row.active_subscription_id as string) ?? null,
        active_sub_plan_id: String(row.active_sub_plan_id ?? row.plan_id),
        active_sub_billing_period: (row.active_sub_billing_period as string) ?? null,
        active_sub_amount_dzd: row.active_sub_amount_dzd != null ? Number(row.active_sub_amount_dzd) : null,
        active_sub_ends_at: (row.active_sub_ends_at as string) ?? null,
        active_sub_starts_at: (row.active_sub_starts_at as string) ?? null,
        pending_commission_dzd: Number(row.pending_commission_dzd ?? 0),
      }));
    },
  });
}

export function useUpsertSalesFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      tenantId: string;
      status?: string;
      priority?: string;
      nextFollowUpAt?: string | null;
      notes?: string;
      upsellPlanId?: string | null;
      markContacted?: boolean;
    }) => {
      const { data, error } = await supabase.rpc("upsert_sales_follow_up", {
        p_tenant_id: payload.tenantId,
        p_status: payload.status ?? null,
        p_priority: payload.priority ?? null,
        p_next_follow_up_at: payload.nextFollowUpAt ?? null,
        p_notes: payload.notes ?? null,
        p_upsell_plan_id: payload.upsellPlanId ?? null,
        p_mark_contacted: payload.markContacted ?? false,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.pipeline });
    },
  });
}

export function useSalesCommissions() {
  return useQuery({
    queryKey: salesQueryKeys.commissions,
    queryFn: async (): Promise<CommissionRow[]> => {
      const { data, error } = await supabase.rpc("get_sales_rep_commissions");
      if (error) throw error;
      return (data ?? []) as CommissionRow[];
    },
  });
}
