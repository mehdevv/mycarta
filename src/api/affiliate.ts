import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invokeFunction, supabase } from "@/lib/supabase";

export interface AffiliateRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  affiliate_code: string;
  social_handle: string | null;
  is_active: boolean;
  created_at: string;
  signup_count: number;
  conversion_count: number;
  pending_commission_dzd: number;
}

export interface AffiliateReferral {
  tenant_id: string;
  business_name: string;
  slug: string;
  plan_id: string;
  subscription_status: string;
  affiliate_code_used: string | null;
  affiliate_first_paid_at: string | null;
  affiliate_benefit_ends_at: string | null;
  affiliate_commission_payments_count: number;
  created_at: string;
  benefit_days_left: number | null;
}

export interface AffiliateDashboard {
  affiliateCode: string;
  socialHandle: string | null;
  signupCount: number;
  conversionCount: number;
  pendingCommissionDzd: number;
  approvedCommissionDzd: number;
  paidCommissionDzd: number;
  referrals: AffiliateReferral[];
}

export interface AffiliateCommissionRow {
  id: string;
  affiliate_id: string;
  tenant_id: string;
  subscription_id: string | null;
  plan_id: string;
  amount_dzd: number;
  commission_rate: number;
  commission_dzd: number;
  payment_period: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  business_name: string;
  slug: string;
  affiliate_name: string;
}

export const affiliateQueryKeys = {
  list: ["affiliates"] as const,
  dashboard: ["affiliate-dashboard"] as const,
  commissions: ["affiliate-commissions"] as const,
};

export function useAffiliates() {
  return useQuery({
    queryKey: affiliateQueryKeys.list,
    queryFn: async (): Promise<AffiliateRow[]> => {
      const { data, error } = await supabase.rpc("list_affiliates");
      if (error) throw error;
      return (data ?? []) as AffiliateRow[];
    },
  });
}

export function useCreateAffiliate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      fullName: string;
      email: string;
      phone: string;
      password: string;
      affiliateCode: string;
      socialHandle?: string;
    }) => invokeFunction("create-affiliate", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: affiliateQueryKeys.list });
    },
  });
}

export function useToggleAffiliateActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { affiliateId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: payload.isActive, updated_at: new Date().toISOString() })
        .eq("id", payload.affiliateId)
        .eq("role", "affiliate");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: affiliateQueryKeys.list });
    },
  });
}

export function useAffiliateDashboard() {
  return useQuery({
    queryKey: affiliateQueryKeys.dashboard,
    queryFn: async (): Promise<AffiliateDashboard> => {
      const { data, error } = await supabase.rpc("get_affiliate_dashboard");
      if (error) throw error;
      return data as AffiliateDashboard;
    },
  });
}

export function useAffiliateCommissions() {
  return useQuery({
    queryKey: affiliateQueryKeys.commissions,
    queryFn: async (): Promise<AffiliateCommissionRow[]> => {
      const { data, error } = await supabase.rpc("get_affiliate_commissions");
      if (error) throw error;
      return (data ?? []) as AffiliateCommissionRow[];
    },
  });
}

export function useUpdateAffiliateCommissionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { commissionId: string; status: "pending" | "approved" | "paid" }) => {
      const { error } = await supabase.rpc("update_affiliate_commission_status", {
        p_commission_id: payload.commissionId,
        p_status: payload.status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: affiliateQueryKeys.commissions });
      queryClient.invalidateQueries({ queryKey: affiliateQueryKeys.list });
      queryClient.invalidateQueries({ queryKey: affiliateQueryKeys.dashboard });
    },
  });
}

export function affiliateReferralUrl(code: string) {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/shop?tab=signup&ref=${encodeURIComponent(code)}`;
}
