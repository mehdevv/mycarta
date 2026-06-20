import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { mapProduct } from "./mappers";
import { getListActivitiesQueryKey, logTenantActivity } from "./activities";

export const getListProductsQueryKey = () => ["products"] as const;

export function useListProducts() {
  return useQuery({
    queryKey: getListProductsQueryKey(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((r) => mapProduct(r));
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ data }: { data: { name: string; sku?: string; category?: string; price: number } }) => {
      const { error } = await supabase.from("products").insert({
        name: data.name,
        sku: data.sku || null,
        category: data.category || null,
        price: data.price,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const payload: Record<string, unknown> = {};
      if (data.name !== undefined) payload.name = data.name;
      if (data.sku !== undefined) payload.sku = data.sku;
      if (data.category !== undefined) payload.category = data.category;
      if (data.price !== undefined) payload.price = data.price;
      if (data.isActive !== undefined) payload.is_active = data.isActive;

      const { error } = await supabase.from("products").update(payload).eq("id", id);
      if (error) throw error;
      return { id, data };
    },
    onSuccess: async (result) => {
      const name = String(result.data.name ?? "");
      if (result.data.isActive === false) {
        const { data: product } = await supabase
          .from("products")
          .select("name")
          .eq("id", result.id)
          .maybeSingle();
        const productName = product?.name ?? (name || "Product");
        await logTenantActivity({
          kind: "product.removed",
          title: "Product removed",
          detail: productName,
          metadata: { productName },
        });
      } else if (name) {
        await logTenantActivity({
          kind: "product.updated",
          title: "Product updated",
          detail: name,
          metadata: { productName: name },
        });
      }
      void queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data: product } = await supabase.from("products").select("name").eq("id", id).maybeSingle();
      const { error } = await supabase.from("products").update({ is_active: false }).eq("id", id);
      if (error) throw error;
      return product?.name ?? "Product";
    },
    onSuccess: async (name) => {
      await logTenantActivity({
        kind: "product.removed",
        title: "Product removed",
        detail: name,
        metadata: { productName: name },
      });
      void queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
    },
  });
}
