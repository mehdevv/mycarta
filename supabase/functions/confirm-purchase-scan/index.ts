// Paste this ENTIRE file into Supabase Dashboard → Edge Functions → confirm-purchase-scan
// Endpoint: {VITE_SUPABASE_URL}/functions/v1/confirm-purchase-scan — JWT: ON
// Local app: http://localhost:5173/worker — All links: supabase/functions/LINKS.md
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type StampMilestone = { position: number; label: string };

function parseMilestones(raw: unknown): StampMilestone[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const position = Math.floor(Number(row.position));
      const label = String(row.label ?? "").trim();
      if (!Number.isFinite(position) || position < 1 || !label) return null;
      return { position, label };
    })
    .filter((item): item is StampMilestone => item !== null)
    .sort((a, b) => a.position - b.position);
}

function resolveStampReward(
  newCycleStamps: number,
  threshold: number,
  milestones: StampMilestone[],
  fallbackReward: string,
) {
  const milestone = milestones.find((m) => m.position === newCycleStamps);
  if (milestone) {
    return {
      rewardTriggered: true,
      rewardDescription: milestone.label,
      finalCycleStamps: newCycleStamps >= threshold ? 0 : newCycleStamps,
    };
  }
  if (newCycleStamps >= threshold) {
    return {
      rewardTriggered: true,
      rewardDescription: fallbackReward || "Loyalty reward",
      finalCycleStamps: 0,
    };
  }
  return { rewardTriggered: false, rewardDescription: null, finalCycleStamps: newCycleStamps };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const { pendingScanId, products } = await req.json();
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: scan } = await admin
      .from("scan_logs")
      .select("*, clients(*)")
      .eq("id", pendingScanId)
      .single();

    if (!scan || !scan.pending_products) {
      return jsonResponse({ error: "Invalid pending scan" }, 400);
    }

    const scanRow = scan as { clients: Record<string, unknown> };
    const client = scanRow.clients;
    const tenantId = scan.tenant_id as string;
    const { data: settings } = await admin
      .from("shop_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .single();
    const threshold = settings?.stamp_threshold ?? 9;
    const milestones = parseMilestones(settings?.stamp_milestones);

    for (const item of products ?? []) {
      await admin.from("scan_products").insert({
        tenant_id: tenantId,
        scan_log_id: pendingScanId,
        product_id: item.productId,
        quantity: item.quantity ?? 1,
      });
    }

    const newCycleStamps = (client.current_cycle_stamps as number) + 1;
    const outcome = resolveStampReward(
      newCycleStamps,
      threshold,
      milestones,
      settings?.reward_value || "Loyalty reward",
    );

    await admin
      .from("scan_logs")
      .update({
        pending_products: false,
        stamps_added: 1,
        reward_triggered: outcome.rewardTriggered,
      })
      .eq("id", pendingScanId);

    if (outcome.rewardTriggered) {
      const { error: rewardError } = await admin.from("rewards").insert({
        tenant_id: tenantId,
        client_id: client.id,
        scan_log_id: pendingScanId,
        reward_description: outcome.rewardDescription!,
      });

      if (rewardError) {
        await admin
          .from("scan_logs")
          .update({
            pending_products: true,
            stamps_added: 0,
            reward_triggered: false,
          })
          .eq("id", pendingScanId);
        return jsonResponse(
          { error: `Reward could not be saved: ${rewardError.message}` },
          500,
        );
      }
    }

    await admin
      .from("clients")
      .update({
        current_cycle_stamps: outcome.finalCycleStamps,
        total_stamps: (client.total_stamps as number) + 1,
        last_scan_at: new Date().toISOString(),
        total_rewards_earned: outcome.rewardTriggered
          ? (client.total_rewards_earned as number) + 1
          : client.total_rewards_earned,
      })
      .eq("id", client.id);

    if (outcome.rewardTriggered) {
      const { data: rewardRow } = await admin
        .from("rewards")
        .select("id")
        .eq("scan_log_id", pendingScanId)
        .maybeSingle();

      return jsonResponse({
        approved: true,
        reason: null,
        stampsAdded: 1,
        currentStamps: outcome.finalCycleStamps,
        stampThreshold: threshold,
        rewardTriggered: true,
        rewardDescription: outcome.rewardDescription,
        rewardId: rewardRow?.id ?? null,
        needsProducts: false,
        clientName: client.full_name,
      });
    }

    return jsonResponse({
      approved: true,
      reason: null,
      stampsAdded: 1,
      currentStamps: outcome.finalCycleStamps,
      stampThreshold: threshold,
      rewardTriggered: outcome.rewardTriggered,
      rewardDescription: outcome.rewardDescription,
      needsProducts: false,
      clientName: client.full_name,
    });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
