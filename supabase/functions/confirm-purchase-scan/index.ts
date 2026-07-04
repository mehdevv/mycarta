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

function responseExtras(
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

    const { pendingScanId, products, amountDzd } = await req.json();
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: scan } = await admin
      .from("scan_logs")
      .select("*, clients(*)")
      .eq("id", pendingScanId)
      .single();

    if (!scan) {
      return jsonResponse({ error: "Invalid pending scan" }, 400);
    }

    const isAmountPending = Boolean(scan.pending_amount);
    const isProductsPending = Boolean(scan.pending_products);
    const willApplyStamps = Boolean(scan.pending_stamps);

    if (!isAmountPending && !isProductsPending) {
      return jsonResponse({ error: "Invalid pending scan" }, 400);
    }

    const tenantId = scan.tenant_id as string;
    const { data: settings } = await admin
      .from("shop_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const flags = resolveProgramFlags(settings as Record<string, unknown> | null);
    const threshold = settings?.stamp_threshold ?? 9;
    const milestones = parseMilestones(settings?.stamp_milestones);
    const spendThreshold = settings?.spend_threshold_dzd ?? 10000;
    const fallbackReward = settings?.reward_value || "Loyalty reward";

    const scanRow = scan as { clients: Record<string, unknown> | null; client_id: string };
    let client = scanRow.clients;
    if (!client) {
      const { data: clientRow } = await admin
        .from("clients")
        .select("*")
        .eq("id", scanRow.client_id)
        .maybeSingle();
      client = clientRow;
    }
    if (!client) {
      return jsonResponse({ error: "Client not found for pending scan" }, 404);
    }

    if (isProductsPending) {
      for (const item of products ?? []) {
        await admin.from("scan_products").insert({
          tenant_id: tenantId,
          scan_log_id: pendingScanId,
          product_id: item.productId,
          quantity: item.quantity ?? 1,
        });
      }

      await admin
        .from("scan_logs")
        .update({ pending_products: false })
        .eq("id", pendingScanId);

      if (isAmountPending) {
        return jsonResponse({
          approved: true,
          reason: null,
          stampsAdded: 0,
          spendAddedDzd: 0,
          rewardTriggered: false,
          needsProducts: false,
          needsAmount: true,
          pendingScanId,
          clientName: client.full_name as string,
          ...responseExtras(settings as Record<string, unknown>, client, flags),
        });
      }

      if (!willApplyStamps) {
        return jsonResponse({ error: "Invalid pending scan" }, 400);
      }

      const newCycleStamps = Number(client.current_cycle_stamps ?? 0) + 1;
      const stampOutcome = resolveStampReward(newCycleStamps, threshold, milestones, fallbackReward);

      await admin
        .from("scan_logs")
        .update({
          pending_stamps: false,
          stamps_added: 1,
          reward_triggered: stampOutcome.rewardTriggered,
        })
        .eq("id", pendingScanId);

      if (stampOutcome.rewardTriggered) {
        const { error: rewardError } = await admin.from("rewards").insert({
          tenant_id: tenantId,
          client_id: client.id,
          scan_log_id: pendingScanId,
          reward_description: stampOutcome.rewardDescription!,
        });

        if (rewardError) {
          await admin
            .from("scan_logs")
            .update({ pending_stamps: true, stamps_added: 0, reward_triggered: false })
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
          current_cycle_stamps: stampOutcome.finalCycleStamps,
          total_stamps: Number(client.total_stamps ?? 0) + 1,
          last_scan_at: new Date().toISOString(),
          total_rewards_earned: stampOutcome.rewardTriggered
            ? Number(client.total_rewards_earned ?? 0) + 1
            : Number(client.total_rewards_earned ?? 0),
        })
        .eq("id", client.id);

      const updatedClient = {
        ...client,
        current_cycle_stamps: stampOutcome.finalCycleStamps,
        current_cycle_spend_dzd: client.current_cycle_spend_dzd ?? 0,
      };

      const baseResponse = {
        approved: true,
        reason: null,
        stampsAdded: 1,
        spendAddedDzd: 0,
        needsProducts: false,
        needsAmount: false,
        clientName: client.full_name as string,
        ...responseExtras(settings as Record<string, unknown>, updatedClient, flags),
      };

      if (stampOutcome.rewardTriggered) {
        const { data: rewardRow } = await admin
          .from("rewards")
          .select("id")
          .eq("scan_log_id", pendingScanId)
          .maybeSingle();

        return jsonResponse({
          ...baseResponse,
          rewardTriggered: true,
          rewardDescription: stampOutcome.rewardDescription,
          rewardId: rewardRow?.id ?? null,
        });
      }

      return jsonResponse({
        ...baseResponse,
        rewardTriggered: false,
        rewardDescription: null,
      });
    }

    const purchaseAmount = Math.max(0, Math.floor(Number(amountDzd) || 0));
    if (purchaseAmount <= 0) {
      return jsonResponse({ error: "amountDzd required" }, 400);
    }

    let stampsAdded = 0;
    let stampOutcome: ReturnType<typeof resolveStampReward> | null = null;
    let spendOutcome: ReturnType<typeof resolveSpendReward> | null = null;
    let finalCycleStamps = Number(client.current_cycle_stamps ?? 0);
    let finalCycleSpendDzd = Number(client.current_cycle_spend_dzd ?? 0);
    let totalRewardsDelta = 0;
    const rewardDescriptions: string[] = [];

    if (willApplyStamps) {
      const newCycleStamps = Number(client.current_cycle_stamps ?? 0) + 1;
      stampOutcome = resolveStampReward(newCycleStamps, threshold, milestones, fallbackReward);
      stampsAdded = 1;
      finalCycleStamps = stampOutcome.finalCycleStamps;
      if (stampOutcome.rewardTriggered && stampOutcome.rewardDescription) {
        rewardDescriptions.push(stampOutcome.rewardDescription);
        totalRewardsDelta += 1;
      }
    }

    const newCycleSpend = Number(client.current_cycle_spend_dzd ?? 0) + purchaseAmount;
    spendOutcome = resolveSpendReward(newCycleSpend, spendThreshold, fallbackReward);
    finalCycleSpendDzd = spendOutcome.finalCycleSpendDzd;
    if (spendOutcome.rewardTriggered && spendOutcome.rewardDescription) {
      rewardDescriptions.push(spendOutcome.rewardDescription);
      totalRewardsDelta += 1;
    }

    await admin
      .from("scan_logs")
      .update({
        pending_amount: false,
        pending_stamps: false,
        purchase_amount_dzd: purchaseAmount,
        spend_added_dzd: purchaseAmount,
        stamps_added: stampsAdded,
        reward_triggered: rewardDescriptions.length > 0,
      })
      .eq("id", pendingScanId);

    if (stampOutcome?.rewardTriggered) {
      const { error: rewardError } = await admin.from("rewards").insert({
        tenant_id: tenantId,
        client_id: client.id,
        scan_log_id: pendingScanId,
        reward_description: stampOutcome.rewardDescription!,
      });

      if (rewardError) {
        await admin
          .from("scan_logs")
          .update({
            pending_amount: true,
            pending_stamps: willApplyStamps,
            purchase_amount_dzd: null,
            spend_added_dzd: 0,
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

    if (spendOutcome.rewardTriggered) {
      const { error: rewardError } = await admin.from("rewards").insert({
        tenant_id: tenantId,
        client_id: client.id,
        scan_log_id: pendingScanId,
        reward_description: spendOutcome.rewardDescription!,
      });

      if (rewardError) {
        if (stampOutcome?.rewardTriggered) {
          await admin.from("rewards").delete().eq("scan_log_id", pendingScanId);
        }
        await admin
          .from("scan_logs")
          .update({
            pending_amount: true,
            pending_stamps: willApplyStamps,
            purchase_amount_dzd: null,
            spend_added_dzd: 0,
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
        current_cycle_stamps: finalCycleStamps,
        total_stamps: willApplyStamps ? Number(client.total_stamps ?? 0) + 1 : Number(client.total_stamps ?? 0),
        current_cycle_spend_dzd: finalCycleSpendDzd,
        total_spend_dzd: Number(client.total_spend_dzd ?? 0) + purchaseAmount,
        last_scan_at: new Date().toISOString(),
        total_rewards_earned: Number(client.total_rewards_earned ?? 0) + totalRewardsDelta,
      })
      .eq("id", client.id);

    const updatedClient = {
      ...client,
      current_cycle_stamps: finalCycleStamps,
      current_cycle_spend_dzd: finalCycleSpendDzd,
    };

    const baseResponse = {
      approved: true,
      reason: null,
      stampsAdded,
      spendAddedDzd: purchaseAmount,
      needsProducts: false,
      needsAmount: false,
      clientName: client.full_name as string,
      ...responseExtras(settings as Record<string, unknown>, updatedClient, flags),
    };

    if (rewardDescriptions.length > 0) {
      const { data: rewardRow } = await admin
        .from("rewards")
        .select("id")
        .eq("scan_log_id", pendingScanId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return jsonResponse({
        ...baseResponse,
        rewardTriggered: true,
        rewardDescription: rewardDescriptions.join(" · "),
        rewardId: rewardRow?.id ?? null,
      });
    }

    return jsonResponse({
      ...baseResponse,
      rewardTriggered: false,
      rewardDescription: null,
    });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
