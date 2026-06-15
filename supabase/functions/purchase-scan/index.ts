// Paste this ENTIRE file into Supabase Dashboard → Edge Functions → purchase-scan
// Endpoint: {VITE_SUPABASE_URL}/functions/v1/purchase-scan — JWT: ON
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

function extractToken(raw: string): string {
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] ?? trimmed;
    if (/^\d{1,6}$/.test(last)) return last.padStart(6, "0");
    return last;
  } catch {
    if (/^\d{1,6}$/.test(trimmed)) return trimmed.padStart(6, "0");
    return trimmed;
  }
}

async function findClientByToken(
  admin: ReturnType<typeof createClient>,
  token: string,
) {
  const lookup = extractToken(token);

  const { data: byCode } = await admin
    .from("clients")
    .select("*")
    .eq("card_code", lookup)
    .maybeSingle();
  if (byCode) return byCode;

  if (/^[0-9a-f-]{36}$/i.test(lookup)) {
    const { data: byUuid } = await admin
      .from("clients")
      .select("*")
      .eq("fidelity_qr_token", lookup)
      .maybeSingle();
    if (byUuid) return byUuid;
  }

  return null;
}

type StampMilestone = { position: number; label: string };

function parseMilestones(raw: unknown): StampMilestone[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is StampMilestone =>
        m &&
        typeof m.position === "number" &&
        typeof m.label === "string" &&
        m.label.trim().length > 0,
    )
    .map((m) => ({ position: Math.floor(m.position), label: m.label.trim() }));
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

function blockedResponse(
  reason: string,
  client: { id: string; full_name: string; current_cycle_stamps: number },
  settings: { stamp_threshold?: number; max_scans_per_day?: number } | null,
  clientName?: string,
) {
  return {
    approved: false,
    reason,
    stampsAdded: 0,
    currentStamps: client.current_cycle_stamps,
    stampThreshold: settings?.stamp_threshold ?? 9,
    maxScansPerDay: settings?.max_scans_per_day ?? 2,
    rewardTriggered: false,
    needsProducts: false,
    clientName: clientName ?? client.full_name,
  };
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

    const { data: worker } = await supabase
      .from("profiles")
      .select("id, role, is_active, email")
      .eq("id", user.id)
      .single();

    if (!worker || worker.role !== "worker" || !worker.is_active) {
      return jsonResponse({ error: "Worker not authorized" }, 403);
    }

    const { clientQrToken } = await req.json();
    const token = extractToken(clientQrToken);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settings } = await admin.from("shop_settings").select("*").limit(1).single();
    const client = await findClientByToken(admin, token);

    if (!client) return jsonResponse({ error: "Client not found" }, 404);

    if (client.is_blocked) {
      await admin.from("scan_logs").insert({
        client_id: client.id,
        worker_id: worker.id,
        scan_type: "purchase",
        status: "blocked_fraud",
        block_reason: "blocked",
        stamps_added: 0,
      });
      return jsonResponse(blockedResponse("blocked", client, settings));
    }

    // FR-06: employee self-scan (same email on client card)
    if (
      client.email &&
      worker.email &&
      client.email.toLowerCase() === worker.email.toLowerCase()
    ) {
      await admin.from("scan_logs").insert({
        client_id: client.id,
        worker_id: worker.id,
        scan_type: "purchase",
        status: "blocked_fraud",
        block_reason: "self_scan",
        stamps_added: 0,
      });
      return jsonResponse(blockedResponse("self_scan", client, settings));
    }

    // FR-05: rapid sequential scans within 60 seconds by any employee
    const sixtySecAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { count: rapidScans } = await admin
      .from("scan_logs")
      .select("*", { count: "exact", head: true })
      .eq("client_id", client.id)
      .gte("scanned_at", sixtySecAgo);

    if ((rapidScans ?? 0) > 0) {
      await admin.from("scan_logs").insert({
        client_id: client.id,
        worker_id: worker.id,
        scan_type: "purchase",
        status: "blocked_fraud",
        block_reason: "rapid_scan",
        stamps_added: 0,
      });
      return jsonResponse(blockedResponse("rapid_scan", client, settings));
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: todayScans } = await admin
      .from("scan_logs")
      .select("*", { count: "exact", head: true })
      .eq("client_id", client.id)
      .eq("status", "approved")
      .gte("scanned_at", todayStart.toISOString());

    if ((todayScans ?? 0) >= (settings?.max_scans_per_day ?? 2)) {
      await admin.from("scan_logs").insert({
        client_id: client.id,
        worker_id: worker.id,
        scan_type: "purchase",
        status: "blocked_limit",
        block_reason: "daily_limit",
        stamps_added: 0,
      });
      return jsonResponse(blockedResponse("daily_limit", client, settings));
    }

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: recentDup } = await admin
      .from("scan_logs")
      .select("*", { count: "exact", head: true })
      .eq("client_id", client.id)
      .eq("worker_id", worker.id)
      .gte("scanned_at", fiveMinAgo);

    if ((recentDup ?? 0) > 0) {
      await admin.from("scan_logs").insert({
        client_id: client.id,
        worker_id: worker.id,
        scan_type: "purchase",
        status: "blocked_fraud",
        block_reason: "too_soon",
        stamps_added: 0,
      });
      return jsonResponse(blockedResponse("too_soon", client, settings));
    }

    if (settings?.track_products) {
      const { data: products } = await admin
        .from("products")
        .select("id, name, price, category")
        .eq("is_active", true)
        .order("name");

      const { data: pendingScan } = await admin
        .from("scan_logs")
        .insert({
          client_id: client.id,
          worker_id: worker.id,
          scan_type: "purchase",
          status: "approved",
          stamps_added: 0,
          pending_products: true,
        })
        .select("id")
        .single();

      return jsonResponse({
        approved: true,
        reason: null,
        stampsAdded: 0,
        currentStamps: client.current_cycle_stamps,
        stampThreshold: settings?.stamp_threshold ?? 9,
        rewardTriggered: false,
        needsProducts: true,
        products: (products ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          category: p.category ?? "",
        })),
        pendingScanId: pendingScan?.id,
        clientName: client.full_name,
      });
    }

    const threshold = settings?.stamp_threshold ?? 9;
    const milestones = parseMilestones(settings?.stamp_milestones);
    const newCycleStamps = client.current_cycle_stamps + 1;
    const outcome = resolveStampReward(
      newCycleStamps,
      threshold,
      milestones,
      settings?.reward_value || "Loyalty reward",
    );

    const { data: scan } = await admin
      .from("scan_logs")
      .insert({
        client_id: client.id,
        worker_id: worker.id,
        scan_type: "purchase",
        status: "approved",
        stamps_added: 1,
        reward_triggered: outcome.rewardTriggered,
      })
      .select("id")
      .single();

    await admin
      .from("clients")
      .update({
        current_cycle_stamps: outcome.finalCycleStamps,
        total_stamps: client.total_stamps + 1,
        last_scan_at: new Date().toISOString(),
        total_rewards_earned: outcome.rewardTriggered
          ? client.total_rewards_earned + 1
          : client.total_rewards_earned,
      })
      .eq("id", client.id);

    if (outcome.rewardTriggered && scan) {
      await admin.from("rewards").insert({
        client_id: client.id,
        scan_log_id: scan.id,
        reward_description: outcome.rewardDescription!,
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
