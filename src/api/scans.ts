import { useMutation, useQuery } from "@tanstack/react-query";
import { invokeFunction, supabase } from "@/lib/supabase";

export function usePurchaseScan() {
  return useMutation({
    mutationFn: async ({ data }: { data: { clientQrToken: string } }) => {
      return invokeFunction<Record<string, unknown>>(
        "purchase-scan",
        { clientQrToken: data.clientQrToken },
        "worker",
      );
    },
  });
}

export function useConfirmPurchaseScan() {
  return useMutation({
    mutationFn: async ({
      data,
    }: {
      data: {
        pendingScanId: string;
        products?: { productId: string; quantity: number }[];
        amountDzd?: number;
      };
    }) => {
      return invokeFunction<Record<string, unknown>>("confirm-purchase-scan", data, "worker");
    },
  });
}

export function useListScans(params?: { page?: number; limit?: number }) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;

  return useQuery({
    queryKey: ["scans", page, limit],
    queryFn: async () => {
      const from = (page - 1) * limit;

      const { data, count, error } = await supabase
        .from("scan_logs")
        .select(
          "*, clients:client_id(full_name), profiles:worker_id(full_name)",
          { count: "exact" },
        )
        .order("scanned_at", { ascending: false })
        .range(from, from + limit - 1);

      if (error) throw error;

      const { count: fraudCount } = await supabase
        .from("scan_logs")
        .select("*", { count: "exact", head: true })
        .neq("status", "approved");

      return {
        scans: (data ?? []).map((s) => ({
          id: s.id,
          clientName: (s.clients as { full_name?: string } | null)?.full_name ?? null,
          workerName: (s.profiles as { full_name?: string } | null)?.full_name ?? null,
          scanType: s.scan_type,
          status: s.status,
          stampsAdded: s.stamps_added,
          rewardTriggered: s.reward_triggered,
          scannedAt: s.scanned_at,
        })),
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
        fraudCount: fraudCount ?? 0,
      };
    },
  });
}

export async function exportScansCsv(): Promise<Blob> {
  const { data, error } = await supabase
    .from("scan_logs")
    .select("scanned_at, status, stamps_added, reward_triggered, clients(full_name), profiles(full_name)")
    .order("scanned_at", { ascending: false });
  if (error) throw error;

  const header = "Date,Client,Worker,Status,Stamps,Reward\n";
  const rows = (data ?? [])
    .map((s) =>
      [
        s.scanned_at,
        (s.clients as { full_name?: string } | null)?.full_name ?? "",
        (s.profiles as { full_name?: string } | null)?.full_name ?? "",
        s.status,
        s.stamps_added,
        s.reward_triggered ? "yes" : "no",
      ].join(","),
    )
    .join("\n");

  return new Blob([header + rows], { type: "text/csv" });
}
