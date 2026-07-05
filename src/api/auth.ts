import { useMutation, useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseClient,
  invokeFunction,
  invokePublicFunction,
  isSupabaseConfigured,
  supabaseBusiness,
  supabaseWorker,
} from "@/lib/supabase";
import type { AuthSlot } from "@/lib/auth-slots";
import type { User } from "./types";

export function setAuthTokenGetter(_getter: () => string | null) {
  // Supabase manages session tokens internally per auth slot.
}

export const getMeQueryKey = (slot: AuthSlot = "business") => ["me", slot] as const;

async function fetchMe(client: SupabaseClient): Promise<User | null> {
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) return null;

  return {
    id: user.id,
    email: user.email ?? "",
    fullName: profile.full_name,
    role: profile.role as User["role"],
    isActive: profile.is_active,
    tenantId: profile.tenant_id ?? null,
    workerQrToken: profile.worker_qr_token,
  };
}

export function useGetMe(
  slot: AuthSlot = "business",
  options?: { query?: { enabled?: boolean; retry?: boolean | number } },
) {
  return useQuery({
    queryKey: getMeQueryKey(slot),
    enabled: options?.query?.enabled ?? true,
    retry: options?.query?.retry ?? 1,
    queryFn: () => fetchMe(getSupabaseClient(slot)),
  });
}

export function useGetSetupStatus() {
  return useQuery({
    queryKey: ["setup-status"],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabaseBusiness.rpc("is_owner_setup_complete");
      if (!error) {
        return { ownerExists: Boolean(data) };
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
      if (!isSupabaseConfigured) {
        throw error;
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/setup-owner`, {
        method: "GET",
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      });

      if (!res.ok) throw error;
      const body = (await res.json()) as { ownerExists?: boolean };
      return { ownerExists: Boolean(body.ownerExists) };
    },
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: async ({ data }: { data: { email: string; password: string } }) => {
      const { data: authData, error } = await supabaseBusiness.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
      return { accessToken: authData.session?.access_token ?? "" };
    },
  });
}

export function useLoginWorker() {
  return useMutation({
    mutationFn: async ({
      data,
    }: {
      data: { tenantSlug: string; fullName: string; password: string };
    }) => {
      const result = await invokePublicFunction<{
        accessToken: string;
        refreshToken: string;
      }>("login-worker", data);

      const { error } = await supabaseWorker.auth.setSession({
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
      });
      if (error) throw error;

      return { accessToken: result.accessToken };
    },
  });
}

export function useLogout(slot: AuthSlot = "business") {
  return useMutation({
    mutationFn: async () => {
      const client = getSupabaseClient(slot);
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },
  });
}

export function useSetupOwner() {
  return useMutation({
    mutationFn: async ({ data }: { data: { fullName: string; email: string; password: string } }) => {
      await invokeFunction("setup-owner", data, "business");
      const { data: authData, error } = await supabaseBusiness.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
      return { accessToken: authData.session?.access_token ?? "" };
    },
  });
}
