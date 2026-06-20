import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const ACTIVITY_FEED_LIMIT = 30;

export type TenantActivity = {
  id: string;
  kind: string;
  detail: string | null;
  actorName: string | null;
  metadata: Record<string, unknown>;
  occurredAt: string;
};

type ActivitiesPage = {
  activities: TenantActivity[];
};

export const getListActivitiesQueryKey = () => ["tenant-activities"] as const;

async function fetchActivities(limit: number): Promise<ActivitiesPage> {
  const { data, error } = await supabase.rpc("list_tenant_activities", {
    p_limit: limit,
    p_offset: 0,
  });
  if (error) throw error;

  const payload = (data ?? { activities: [] }) as {
    activities?: Array<{
      id: string;
      kind: string;
      detail?: string | null;
      actorName?: string | null;
      metadata?: Record<string, unknown>;
      occurredAt: string;
    }>;
  };

  return {
    activities: (payload.activities ?? []).map((row) => ({
      id: row.id,
      kind: row.kind,
      detail: row.detail ?? null,
      actorName: row.actorName ?? null,
      metadata: row.metadata ?? {},
      occurredAt: row.occurredAt,
    })),
  };
}

export function useListActivities(limit = ACTIVITY_FEED_LIMIT) {
  return useQuery({
    queryKey: [...getListActivitiesQueryKey(), limit],
    queryFn: () => fetchActivities(limit),
  });
}

export async function logTenantActivity(params: {
  kind: string;
  title: string;
  detail?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await supabase.rpc("log_tenant_activity", {
      p_kind: params.kind,
      p_title: params.title,
      p_detail: params.detail ?? null,
      p_metadata: params.metadata ?? {},
    });
  } catch {
    // Activity logging must not block primary actions.
  }
}
