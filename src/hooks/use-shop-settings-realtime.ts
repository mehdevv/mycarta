import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetSettingsQueryKey } from "@/api";
import { useCurrentTenant } from "@/lib/tenant-context";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

/** Refetch shop_settings when the row changes in Supabase (multi-tab / multi-device sync). */
export function useShopSettingsRealtime() {
  const queryClient = useQueryClient();
  const { tenant } = useCurrentTenant();
  const { user } = useAuth();

  useEffect(() => {
    if (!tenant?.id || user?.role !== "owner") return;

    const channel = supabase
      .channel(`shop-settings-${tenant.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "shop_settings",
          filter: `tenant_id=eq.${tenant.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tenant?.id, user?.role, queryClient]);
}
