import { useMutation, useQuery } from "@tanstack/react-query";
import { getSupabaseClient, supabase } from "@/lib/supabase";

export const FRAUD_REASON_LABELS: Record<string, string> = {
  blocked: "Customer card is blocked",
  daily_limit: "Maximum daily order limit reached",
  too_soon: "Same employee scanned too recently",
  rapid_scan: "Customer scanned again within 60 seconds",
  self_scan: "Employee cannot scan their own card",
};

export function useListFraudEvents(params?: { reviewed?: boolean }) {
  return useQuery({
    queryKey: ["fraud-events", params],
    queryFn: async () => {
      let query = supabase
        .from("scan_logs")
        .select(
          "*, clients:client_id(full_name), profiles:worker_id(full_name)",
        )
        .neq("status", "approved")
        .order("scanned_at", { ascending: false });

      if (params?.reviewed === false) {
        query = query.is("reviewed_at", null);
      } else if (params?.reviewed === true) {
        query = query.not("reviewed_at", "is", null);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;

      return (data ?? []).map((s) => ({
        id: s.id,
        clientName: (s.clients as { full_name?: string } | null)?.full_name ?? null,
        workerName: (s.profiles as { full_name?: string } | null)?.full_name ?? null,
        status: s.status,
        blockReason: s.block_reason,
        blockReasonLabel: FRAUD_REASON_LABELS[s.block_reason ?? ""] ?? s.block_reason ?? "Unknown",
        scannedAt: s.scanned_at,
        reviewedAt: s.reviewed_at,
        reviewNotes: s.review_notes,
      }));
    },
  });
}

export function useReviewFraudEvent() {
  return useMutation({
    mutationFn: async ({
      id,
      notes,
    }: {
      id: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from("scan_logs")
        .update({
          reviewed_at: new Date().toISOString(),
          review_notes: notes ?? null,
        })
        .eq("id", id);
      if (error) throw error;
    },
  });
}

export function useWorkerTodayScans() {
  return useQuery({
    queryKey: ["worker-today-scans"],
    queryFn: async () => {
      const supabase = getSupabaseClient("worker");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { scans: [], count: 0 };

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data, count, error } = await supabase
        .from("scan_logs")
        .select("*, clients:client_id(full_name, phone)", { count: "exact" })
        .eq("worker_id", user.id)
        .gte("scanned_at", todayStart.toISOString())
        .order("scanned_at", { ascending: false });

      if (error) throw error;

      return {
        count: count ?? 0,
        scans: (data ?? []).map((s) => ({
          id: s.id,
          clientName: (s.clients as { full_name?: string } | null)?.full_name ?? "Unknown",
          clientPhone: (s.clients as { phone?: string | null } | null)?.phone ?? null,
          status: s.status,
          stampsAdded: s.stamps_added,
          rewardTriggered: s.reward_triggered,
          scannedAt: s.scanned_at,
          blockReasonLabel: FRAUD_REASON_LABELS[s.block_reason ?? ""] ?? null,
        })),
      };
    },
  });
}

export async function exportFraudCsv(): Promise<Blob> {
  const { data, error } = await supabase
    .from("scan_logs")
    .select("scanned_at, status, block_reason, clients(full_name), profiles(full_name), reviewed_at")
    .neq("status", "approved")
    .order("scanned_at", { ascending: false });
  if (error) throw error;

  const header = "Date,Client,Worker,Status,Reason,Reviewed\n";
  const rows = (data ?? [])
    .map((s) =>
      [
        s.scanned_at,
        (s.clients as { full_name?: string } | null)?.full_name ?? "",
        (s.profiles as { full_name?: string } | null)?.full_name ?? "",
        s.status,
        s.block_reason ?? "",
        s.reviewed_at ? "yes" : "no",
      ].join(","),
    )
    .join("\n");

  return new Blob([header + rows], { type: "text/csv" });
}
