import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { mapSettings, snakeCaseKeys } from "./mappers";
import type { ShopSettings } from "./types";
import { getTenantQueryKey } from "./tenant";

export const getGetSettingsQueryKey = (slug?: string) =>
  slug ? (["settings", slug] as const) : (["settings"] as const);

async function resolveTenantId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (error || !profile?.tenant_id) throw new Error("Tenant not found");
  return profile.tenant_id;
}

async function fetchSettingsByTenantId(tenantId: string): Promise<ShopSettings> {
  const { data, error } = await supabase
    .from("shop_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .single();

  if (error) throw error;
  return mapSettings(data);
}

export function useGetSettings(slug?: string) {
  return useQuery({
    queryKey: getGetSettingsQueryKey(slug),
    queryFn: async (): Promise<ShopSettings> => {
      if (slug) {
        const { data: tenantData, error: tenantError } = await supabase.rpc("get_tenant_by_slug", {
          p_slug: slug,
        });
        if (tenantError) throw tenantError;
        const tenant = tenantData as { id?: string } | null;
        if (!tenant?.id) throw new Error("Shop not found");
        return fetchSettingsByTenantId(tenant.id);
      }

      const tenantId = await resolveTenantId();
      return fetchSettingsByTenantId(tenantId);
    },
  });
}

export type UpdateSettingsOptions = {
  id: string;
  data: Record<string, unknown>;
  /** Mirror name, logo, brand color on tenants row */
  syncTenantBranding?: boolean;
};

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      data,
      syncTenantBranding = false,
    }: UpdateSettingsOptions): Promise<ShopSettings> => {
      const tenantId = await resolveTenantId();
      const payload = {
        ...snakeCaseKeys(data),
        updated_at: new Date().toISOString(),
      };

      const { data: row, error } = await supabase
        .from("shop_settings")
        .update(payload)
        .eq("tenant_id", tenantId)
        .select()
        .single();

      if (error) throw error;

      if (syncTenantBranding) {
        const tenantPatch: Record<string, unknown> = {};
        if ("business_name" in payload && payload.business_name) {
          tenantPatch.name = payload.business_name;
        }
        if ("logo_url" in payload) tenantPatch.logo_url = payload.logo_url;
        if ("primary_color" in payload) tenantPatch.brand_color = payload.primary_color;

        if (Object.keys(tenantPatch).length > 0) {
          await supabase.from("tenants").update(tenantPatch).eq("id", tenantId);
        }
      }

      return mapSettings(row);
    },
    onSuccess: (mapped, variables) => {
      queryClient.setQueryData(getGetSettingsQueryKey(), mapped);
      if (variables.syncTenantBranding) {
        queryClient.invalidateQueries({ queryKey: getTenantQueryKey() });
      }
    },
  });
}
