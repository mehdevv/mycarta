import { formatScanLimitCountdown } from "@/lib/scan-limit-countdown";
import { scanCooldownSecondsLeft } from "@/lib/scan-cooldown";

export type ClientQrBlockingVariant = "limit" | "cooldown" | "pending";

/** Shown when the loyalty QR must not be scanned — always blurred with reason + countdown. */
export type ClientQrBlockingStatus = {
  variant: ClientQrBlockingVariant;
  reason: string;
  hint?: string;
  countdownLabel: string;
  countdown: string;
};

export type ClientRecentScan = {
  scannedAt: string;
  status: string;
  stampsAdded: number;
  spendAddedDzd?: number;
};

const PENDING_MAX_AGE_MS = 30 * 60 * 1000;

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

function nextUtcMidnightIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function secondsUntil(iso: string | null | undefined, now: number): number {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 1000));
}

function pendingCountdown(ageMs: number): string {
  const remaining = Math.max(0, PENDING_MAX_AGE_MS - ageMs);
  return formatScanLimitCountdown(Math.ceil(remaining / 1000));
}

function dailyLimitCountdown(args: {
  scanLimitCountdown: string;
  scanLimitSecondsLeft: number;
  scansResetAt?: string | null;
  now: number;
}): string {
  if (args.scanLimitSecondsLeft > 0) return args.scanLimitCountdown;
  const resetIso = args.scansResetAt ?? nextUtcMidnightIso();
  return formatScanLimitCountdown(secondsUntil(resetIso, args.now));
}

export function resolveClientQrBlockingStatus(args: {
  scanLimitActive: boolean;
  scanLimitCountdown: string;
  scanLimitSecondsLeft: number;
  scansResetAt?: string | null;
  scansToday: number;
  maxScansPerDay: number;
  recentScans?: ClientRecentScan[];
  now: number;
  t: TranslateFn;
}): ClientQrBlockingStatus | null {
  const {
    scanLimitActive,
    scanLimitCountdown,
    scanLimitSecondsLeft,
    scansResetAt,
    scansToday,
    maxScansPerDay,
    recentScans,
    now,
    t,
  } = args;

  const latest = recentScans?.[0];
  const latestAge = latest?.scannedAt
    ? now - new Date(latest.scannedAt).getTime()
    : Number.POSITIVE_INFINITY;

  const dailyLimitReached =
    scanLimitActive ||
    (maxScansPerDay > 0 && scansToday >= maxScansPerDay) ||
    latest?.status === "blocked_limit";

  if (dailyLimitReached) {
    return {
      variant: "limit",
      reason: t("qrStatusBlockedLimit"),
      hint: t("scanLimitHint", { used: scansToday, max: maxScansPerDay }),
      countdownLabel: t("qrCooldownIn"),
      countdown: dailyLimitCountdown({
        scanLimitCountdown,
        scanLimitSecondsLeft,
        scansResetAt,
        now,
      }),
    };
  }

  if (
    latest?.status === "pending" &&
    Number.isFinite(latestAge) &&
    latestAge >= 0 &&
    latestAge < PENDING_MAX_AGE_MS
  ) {
    return {
      variant: "pending",
      reason: t("qrStatusPending"),
      hint: t("qrStatusPendingHint"),
      countdownLabel: t("qrCooldownPending"),
      countdown: pendingCountdown(latestAge),
    };
  }

  const cooldownSec = scanCooldownSecondsLeft(latest?.scannedAt, latest?.status, now);
  if (cooldownSec > 0) {
    return {
      variant: "cooldown",
      reason: t("qrStatusCooldown"),
      hint: t("qrStatusCooldownHint"),
      countdownLabel: t("qrCooldownScan"),
      countdown: formatScanLimitCountdown(cooldownSec),
    };
  }

  return null;
}
