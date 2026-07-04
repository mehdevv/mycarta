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
  tenantId: string,
) {
  const lookup = extractToken(token);

  const { data: byCode } = await admin
    .from("clients")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("card_code", lookup)
    .maybeSingle();
  if (byCode) return byCode;

  if (/^[0-9a-f-]{36}$/i.test(lookup)) {
    const { data: byUuid } = await admin
      .from("clients")
      .select("*")
      .eq("tenant_id", tenantId)
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

function resolveSpendReward(
  newCycleSpendDzd: number,
  spendThresholdDzd: number,
  fallbackReward: string,
) {
  if (spendThresholdDzd <= 0) {
    return { rewardTriggered: false, rewardDescription: null, finalCycleSpendDzd: newCycleSpendDzd };
  }
  if (newCycleSpendDzd >= spendThresholdDzd) {
    return {
      rewardTriggered: true,
      rewardDescription: fallbackReward || "Loyalty reward",
      finalCycleSpendDzd: 0,
    };
  }
  return { rewardTriggered: false, rewardDescription: null, finalCycleSpendDzd: newCycleSpendDzd };
}

function resolveProgramFlags(settings: Record<string, unknown> | null) {
  if (!settings) return { stampsEnabled: true, spendEnabled: false };
  if (settings.stamps_enabled !== undefined || settings.spend_enabled !== undefined) {
    return {
      stampsEnabled: settings.stamps_enabled !== false,
      spendEnabled: settings.spend_enabled === true,
    };
  }
  const mode = String(settings.reward_mode ?? "stamps");
  return {
    stampsEnabled: mode === "stamps" || mode === "both",
    spendEnabled: mode === "spend" || mode === "both",
  };
}

function programModeLabel(flags: { stampsEnabled: boolean; spendEnabled: boolean }) {
  if (flags.stampsEnabled && flags.spendEnabled) return "both";
  if (flags.spendEnabled) return "spend";
  return "stamps";
}

function scanResponseExtras(
  settings: Record<string, unknown> | null,
  client: Record<string, unknown>,
  flags: { stampsEnabled: boolean; spendEnabled: boolean },
) {
  return {
    stampsEnabled: flags.stampsEnabled,
    spendEnabled: flags.spendEnabled,
    rewardMode: programModeLabel(flags),
    currency: settings?.currency ?? "DZD",
    currentStamps: Number(client.current_cycle_stamps ?? 0),
    currentCycleSpendDzd: Number(client.current_cycle_spend_dzd ?? 0),
    stampThreshold: settings?.stamp_threshold ?? 9,
    spendThresholdDzd: settings?.spend_threshold_dzd ?? 10000,
  };
}

function blockedResponse(
  reason: string,
  client: {
    id: string;
    full_name: string;
    current_cycle_stamps: number;
    current_cycle_spend_dzd?: number;
  },
  settings: {
    stamp_threshold?: number;
    spend_threshold_dzd?: number;
    max_scans_per_day?: number;
    reward_mode?: string;
    currency?: string;
  } | null,
  clientName?: string,
) {
  const flags = resolveProgramFlags(settings as Record<string, unknown> | null);
  return {
    approved: false,
    reason,
    stampsAdded: 0,
    spendAddedDzd: 0,
    currentStamps: Number(client.current_cycle_stamps ?? 0),
    currentCycleSpendDzd: Number(client.current_cycle_spend_dzd ?? 0),
    stampThreshold: settings?.stamp_threshold ?? 9,
    spendThresholdDzd: settings?.spend_threshold_dzd ?? 10000,
    stampsEnabled: flags.stampsEnabled,
    spendEnabled: flags.spendEnabled,
    rewardMode: programModeLabel(flags),
    currency: settings?.currency ?? "DZD",
    maxScansPerDay: settings?.max_scans_per_day ?? 2,
    rewardTriggered: false,
    needsProducts: false,
    needsAmount: false,
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
      .select("id, role, is_active, email, tenant_id")
      .eq("id", user.id)
      .single();

    if (!worker || worker.role !== "worker" || !worker.is_active || !worker.tenant_id) {
      return jsonResponse({ error: "Worker not authorized" }, 403);
    }

    const tenantId = worker.tenant_id as string;

    const { clientQrToken } = await req.json();
    const token = extractToken(clientQrToken);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: limitsRaw } = await admin.rpc("check_plan_limits", {
      p_tenant_id: tenantId,
      p_check: "tenant_scans_today",
    });
    const limits = limitsRaw as { allowed?: boolean; reason?: string; upgrade_required?: boolean };
    if (!limits?.allowed) {
      return jsonResponse(
        { error: limits.reason ?? "plan_limit", upgradeRequired: limits.upgrade_required ?? true },
        402,
      );
    }

    const { data: settings } = await admin
      .from("shop_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    const client = await findClientByToken(admin, token, tenantId);

    if (!client) return jsonResponse({ error: "Client not found" }, 404);

    if (client.is_blocked) {
      await admin.from("scan_logs").insert({
        tenant_id: tenantId,
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
        tenant_id: tenantId,
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
        tenant_id: tenantId,
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
      .or("stamps_added.gt.0,spend_added_dzd.gt.0,purchase_amount_dzd.gt.0")
      .gte("scanned_at", todayStart.toISOString());

    if ((todayScans ?? 0) >= (settings?.max_scans_per_day ?? 2)) {
      await admin.from("scan_logs").insert({
        tenant_id: tenantId,
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
        tenant_id: tenantId,
        client_id: client.id,
        worker_id: worker.id,
        scan_type: "purchase",
        status: "blocked_fraud",
        block_reason: "too_soon",
        stamps_added: 0,
      });
      return jsonResponse(blockedResponse("too_soon", client, settings));
    }

    const flags = resolveProgramFlags(settings as Record<string, unknown> | null);
    if (!flags.stampsEnabled && !flags.spendEnabled) {
      return jsonResponse({ error: "Loyalty program not configured" }, 400);
    }

    const needsProducts = flags.stampsEnabled && Boolean(settings?.track_products);
    const needsAmount = flags.spendEnabled;
    const needsWorkerInput = needsProducts || needsAmount;

    if (needsWorkerInput) {
      let products: { id: string; name: string; price: number; category: string }[] = [];
      if (needsProducts) {
        const { data: productRows } = await admin
          .from("products")
          .select("id, name, price, category")
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .order("name");
        products = (productRows ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          category: p.category ?? "",
        }));
      }

      const { data: pendingScan, error: pendingError } = await admin
        .from("scan_logs")
        .insert({
          tenant_id: tenantId,
          client_id: client.id,
          worker_id: worker.id,
          scan_type: "purchase",
          status: "approved",
          stamps_added: 0,
          spend_added_dzd: 0,
          pending_products: needsProducts,
          pending_amount: needsAmount,
          pending_stamps: flags.stampsEnabled,
        })
        .select("id")
        .single();

      if (pendingError || !pendingScan?.id) {
        return jsonResponse(
          { error: pendingError?.message ?? "Could not start pending scan" },
          500,
        );
      }

      return jsonResponse({
        approved: true,
        reason: null,
        stampsAdded: 0,
        spendAddedDzd: 0,
        rewardTriggered: false,
        needsProducts,
        needsAmount,
        products,
        pendingScanId: pendingScan.id,
        clientName: client.full_name,
        ...scanResponseExtras(settings as Record<string, unknown>, client, flags),
      });
    }

    const threshold = settings?.stamp_threshold ?? 9;
    const milestones = parseMilestones(settings?.stamp_milestones);
    const currentCycleStamps = Number(client.current_cycle_stamps ?? 0);
    const newCycleStamps = currentCycleStamps + 1;
    const outcome = resolveStampReward(
      newCycleStamps,
      threshold,
      milestones,
      settings?.reward_value || "Loyalty reward",
    );

    const { data: scan } = await admin
      .from("scan_logs")
      .insert({
        tenant_id: tenantId,
        client_id: client.id,
        worker_id: worker.id,
        scan_type: "purchase",
        status: "approved",
        stamps_added: 1,
        reward_triggered: outcome.rewardTriggered,
      })
      .select("id")
      .single();

    if (outcome.rewardTriggered && scan) {
      const { error: rewardError } = await admin.from("rewards").insert({
        tenant_id: tenantId,
        client_id: client.id,
        scan_log_id: scan.id,
        reward_description: outcome.rewardDescription!,
      });

      if (rewardError) {
        await admin.from("scan_logs").delete().eq("id", scan.id);
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
        total_stamps: Number(client.total_stamps ?? 0) + 1,
        last_scan_at: new Date().toISOString(),
        total_rewards_earned: outcome.rewardTriggered
          ? Number(client.total_rewards_earned ?? 0) + 1
          : Number(client.total_rewards_earned ?? 0),
      })
      .eq("id", client.id);

    if (outcome.rewardTriggered && scan) {
      const { data: rewardRow } = await admin
        .from("rewards")
        .select("id")
        .eq("scan_log_id", scan.id)
        .maybeSingle();

      const flags = resolveProgramFlags(settings as Record<string, unknown> | null);
      return jsonResponse({
        approved: true,
        reason: null,
        stampsAdded: 1,
        spendAddedDzd: 0,
        rewardTriggered: true,
        rewardDescription: outcome.rewardDescription,
        rewardId: rewardRow?.id ?? null,
        needsProducts: false,
        needsAmount: false,
        clientName: client.full_name,
        ...scanResponseExtras(
          settings as Record<string, unknown>,
          { ...client, current_cycle_stamps: outcome.finalCycleStamps },
          flags,
        ),
      });
    }

    const flags = resolveProgramFlags(settings as Record<string, unknown> | null);
    return jsonResponse({
      approved: true,
      reason: null,
      stampsAdded: 1,
      spendAddedDzd: 0,
      rewardTriggered: outcome.rewardTriggered,
      rewardDescription: outcome.rewardDescription,
      needsProducts: false,
      needsAmount: false,
      clientName: client.full_name,
      ...scanResponseExtras(
        settings as Record<string, unknown>,
        { ...client, current_cycle_stamps: outcome.finalCycleStamps },
        flags,
      ),
    });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
