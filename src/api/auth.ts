import { useMutation, useQuery } from "@tanstack/react-query";
import { invokeFunction, isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { User } from "./types";

export function setAuthTokenGetter(_getter: () => string | null) {
  // Supabase manages session tokens internally
}

export const getMeQueryKey = () => ["me"] as const;

export function useGetMe(options?: { query?: { enabled?: boolean; retry?: boolean | number } }) {
  return useQuery({
    queryKey: getMeQueryKey(),
    enabled: options?.query?.enabled ?? true,
    retry: options?.query?.retry ?? 1,
    queryFn: async (): Promise<User | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile, error } = await supabase
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
    },
  });
}

export function useGetSetupStatus() {
  return useQuery({
    queryKey: ["setup-status"],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_owner_setup_complete");
      if (!error) {
        return { ownerExists: Boolean(data) };
      }

      // Fallback until migration 003 is applied (or if RPC is unavailable).
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
      const { data: authData, error } = await supabase.auth.signInWithPassword({
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
      const result = await invokeFunction<{
        accessToken: string;
        refreshToken: string;
      }>("login-worker", data);

      const { error } = await supabase.auth.setSession({
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
      });
      if (error) throw error;

      return { accessToken: result.accessToken };
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  });
}

export function useSetupOwner() {
  return useMutation({
    mutationFn: async ({ data }: { data: { fullName: string; email: string; password: string } }) => {
      await invokeFunction("setup-owner", data);
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
      return { accessToken: authData.session?.access_token ?? "" };
    },
  });
}
