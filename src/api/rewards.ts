import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase, invokeFunction } from "@/lib/supabase";
import type { RewardClaim } from "./types";

export const getListRewardsQueryKey = (params?: Record<string, unknown>) =>
  ["rewards", params] as const;

export function useListRewards(params?: { page?: number; limit?: number; status?: string }) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;

  return useQuery({
    queryKey: getListRewardsQueryKey(params),
    queryFn: async () => {
      let query = supabase
        .from("rewards")
        .select("*, clients(full_name), redeemer:redeemed_by_worker_id(full_name)", { count: "exact" })
        .order("created_at", { ascending: false });

      if (params?.status === "pending") query = query.is("redeemed_at", null);
      if (params?.status === "redeemed") query = query.not("redeemed_at", "is", null);

      const from = (page - 1) * limit;
      const { data, count, error } = await query.range(from, from + limit - 1);
      if (error) throw error;

      return {
        rewards: (data ?? []).map((r) => ({
          id: r.id,
          clientName: (r.clients as { full_name?: string } | null)?.full_name ?? null,
          rewardDescription: r.reward_description,
          createdAt: r.created_at,
          redeemedAt: r.redeemed_at,
          redeemedByWorkerName: (r.redeemer as { full_name?: string } | null)?.full_name ?? null,
        })),
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      };
    },
  });
}

export function useRedeemReward() {
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("rewards")
        .update({
          redeemed_at: new Date().toISOString(),
          redeemed_by_worker_id: user?.id ?? null,
        })
        .eq("id", id);
      if (error) throw error;
    },
  });
}

export function useGetRewardClaim(token: string, options?: { query?: { enabled?: boolean } }) {
  return useQuery({
    queryKey: ["reward-claim", "card", token],
    enabled: (options?.query?.enabled ?? true) && !!token,
    queryFn: async (): Promise<RewardClaim | null> => {
      const { data, error } = await supabase.rpc("get_reward_claim_by_token", {
        p_token: token,
      });
      if (error) throw error;
      return (data as RewardClaim | null) ?? null;
    },
  });
}

export function useGetRewardClaimById(
  rewardId: string,
  options?: { query?: { enabled?: boolean; pollWhilePending?: boolean } },
) {
  const pollWhilePending = options?.query?.pollWhilePending ?? true;

  return useQuery({
    queryKey: ["reward-claim", "id", rewardId],
    enabled: (options?.query?.enabled ?? true) && !!rewardId,
    queryFn: async (): Promise<RewardClaim | null> => {
      const { data, error } = await supabase.rpc("get_reward_claim_by_id", {
        p_reward_id: rewardId,
      });
      if (error) throw error;
      return (data as RewardClaim | null) ?? null;
    },
    refetchInterval: (query) => {
      if (!pollWhilePending) return false;
      const data = query.state.data;
      if (!data || data.redeemedAt) return false;
      return 2000;
    },
  });
}

export function useRedeemRewardScan() {
  return useMutation({
    mutationFn: async ({ data }: { data: { rewardQrToken: string } }) => {
      return invokeFunction<{
        approved: boolean;
        reason: string | null;
        clientName: string | null;
        rewardDescription: string;
        redeemedAt?: string;
      }>("redeem-reward", {
        rewardQrToken: data.rewardQrToken,
      }, "worker");
    },
  });
}
