import { useMutation, useQuery } from "@tanstack/react-query";
import { invokeFunction, supabase } from "@/lib/supabase";
import { mapClient, mapClientCard, mapClientCardReward } from "./mappers";
import type { Client, ClientCard } from "./types";
import { mapSettings } from "./mappers";

export const getListClientsQueryKey = (params?: Record<string, unknown>) =>
  ["clients", params] as const;

export function useListClients(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;

  return useQuery({
    queryKey: getListClientsQueryKey(params),
    queryFn: async () => {
      let query = supabase
        .from("clients")
        .select("*", { count: "exact" })
        .order("enrolled_at", { ascending: false });

      if (params?.search) {
        const s = `%${params.search}%`;
        query = query.or(`full_name.ilike.${s},phone.ilike.${s},email.ilike.${s}`);
      }
      if (params?.status === "active") query = query.eq("is_blocked", false);
      if (params?.status === "blocked") query = query.eq("is_blocked", true);

      const from = (page - 1) * limit;
      const { data, count, error } = await query.range(from, from + limit - 1);
      if (error) throw error;

      return {
        clients: (data ?? []).map((r) => mapClient(r)),
        total: count ?? 0,
        page,
        totalPages: Math.ceil((count ?? 0) / limit),
      };
    },
  });
}

export function useGetClient(id?: string) {
  return useQuery({
    queryKey: ["client", id],
    enabled: !!id,
    queryFn: async () => {
      const { data: client, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;

      const { data: scans } = await supabase
        .from("scan_logs")
        .select("*, profiles:worker_id(full_name)")
        .eq("client_id", id!)
        .order("scanned_at", { ascending: false })
        .limit(50);

      const { data: rewards } = await supabase
        .from("rewards")
        .select("*")
        .eq("client_id", id!)
        .order("created_at", { ascending: false });

      const { data: settings } = await supabase
        .from("shop_settings")
        .select("stamp_threshold")
        .limit(1)
        .single();

      return {
        client: mapClient(client),
        stampThreshold: settings?.stamp_threshold ?? 9,
        scans: (scans ?? []).map((s) => ({
          id: s.id,
          scannedAt: s.scanned_at,
          status: s.status,
          stampsAdded: s.stamps_added,
          workerName: (s.profiles as { full_name?: string } | null)?.full_name ?? null,
          rewardTriggered: s.reward_triggered,
        })),
        rewards: (rewards ?? []).map((r) => ({
          id: r.id,
          rewardDescription: r.reward_description,
          createdAt: r.created_at,
          redeemedAt: r.redeemed_at,
        })),
      };
    },
  });
}

export function useUpdateClient() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const payload: Record<string, unknown> = {};
      if (data.notes !== undefined) payload.notes = data.notes;
      if (data.isBlocked !== undefined) payload.is_blocked = data.isBlocked;

      const { error } = await supabase.from("clients").update(payload).eq("id", id);
      if (error) throw error;
    },
  });
}

export function useDeleteClient() {
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from("clients")
        .update({
          full_name: "Anonymised",
          phone: null,
          email: null,
          notes: null,
          is_blocked: true,
        })
        .eq("id", id);
      if (error) throw error;
    },
  });
}

export function useEnrolClient() {
  return useMutation({
    mutationFn: async ({
      data,
    }: {
      data: { fullName: string; phone: string; email?: string; slug: string };
    }) => {
      return invokeFunction<{
        cardCode: string;
        fullName: string;
        phone: string;
        existing?: boolean;
        tenantSlug?: string;
      }>("enrol-client", { ...data, tenantSlug: data.slug });
    },
  });
}

export function useLoginClient() {
  return useMutation({
    mutationFn: async ({ data }: { data: { phone: string; password: string } }) => {
      return invokeFunction<{ cardCode: string; fullName: string }>("login-client", data);
    },
  });
}

export function useGetClientCard(
  token: string,
  options?: { query?: { enabled?: boolean }; tenantId?: string },
) {
  return useQuery({
    queryKey: ["client-card", token, options?.tenantId],
    enabled: (options?.query?.enabled ?? true) && !!token,
    refetchOnWindowFocus: true,
    refetchInterval: 8000,
    queryFn: async (): Promise<ClientCard> => {
      const { data, error } = await supabase.rpc("get_client_card_by_token", {
        p_token: token,
        p_tenant_id: options?.tenantId ?? null,
      });
      if (error) throw error;
      if (!data) throw new Error("Card not found");

      let card = mapClientCard(data as Record<string, unknown>);

      const { data: rewardsData, error: rewardsError } = await supabase.rpc(
        "get_client_rewards_by_token",
        { p_token: token, p_tenant_id: options?.tenantId ?? null },
      );

      if (!rewardsError && Array.isArray(rewardsData) && rewardsData.length > 0) {
        const fromRpc = rewardsData
          .map((item) => mapClientCardReward(item as Record<string, unknown>))
          .filter((reward) => reward.id);

        const merged = new Map<string, (typeof fromRpc)[0]>();
        for (const reward of [...fromRpc, ...(card.rewards ?? [])]) {
          merged.set(reward.id, reward);
        }
        card = {
          ...card,
          rewards: Array.from(merged.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
        };
      }

      return card;
    },
  });
}

export async function exportContactsCsv(): Promise<Blob> {
  const { data, error } = await supabase
    .from("clients")
    .select("full_name, phone, email, total_stamps, enrolled_at, is_blocked")
    .order("full_name");
  if (error) throw error;

  const header = "Name,Phone,Email,Stamps,Enrolled,Status\n";
  const rows = (data ?? [])
    .map((c) =>
      [
        `"${(c.full_name ?? "").replace(/"/g, '""')}"`,
        c.phone ?? "",
        c.email ?? "",
        c.total_stamps,
        c.enrolled_at,
        c.is_blocked ? "blocked" : "active",
      ].join(","),
    )
    .join("\n");

  return new Blob([header + rows], { type: "text/csv" });
}

export type { Client };
