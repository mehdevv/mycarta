import { formatScanLimitCountdown } from "@/lib/scan-limit-countdown";
import { resolveCooldownSecondsLeft } from "@/lib/scan-cooldown";

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
  blockReason?: string;
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

function pendingCountdownFromIso(openPendingAt: string, now: number): string {
  const ageMs = now - new Date(openPendingAt).getTime();
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

function isActivePending(openPendingAt: string | null | undefined, now: number): boolean {
  if (!openPendingAt) return false;
  const ageMs = now - new Date(openPendingAt).getTime();
  return Number.isFinite(ageMs) && ageMs >= 0 && ageMs < PENDING_MAX_AGE_MS;
}

export function resolveClientQrBlockingStatus(args: {
  scanLimitActive: boolean;
  scanLimitCountdown: string;
  scanLimitSecondsLeft: number;
  scansResetAt?: string | null;
  scansToday: number;
  maxScansPerDay: number;
  lastScanAt?: string | null;
  openPendingAt?: string | null;
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
    lastScanAt,
    openPendingAt,
    recentScans,
    now,
    t,
  } = args;

  const dailyLimitReached =
    scanLimitActive ||
    (maxScansPerDay > 0 && scansToday >= maxScansPerDay);

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

  if (isActivePending(openPendingAt, now)) {
    return {
      variant: "pending",
      reason: t("qrStatusPending"),
      hint: t("qrStatusPendingHint"),
      countdownLabel: t("qrCooldownPending"),
      countdown: pendingCountdownFromIso(openPendingAt!, now),
    };
  }

  const latestPending = recentScans?.find((scan) => scan.status === "pending");
  if (
    latestPending?.scannedAt &&
    isActivePending(latestPending.scannedAt, now)
  ) {
    return {
      variant: "pending",
      reason: t("qrStatusPending"),
      hint: t("qrStatusPendingHint"),
      countdownLabel: t("qrCooldownPending"),
      countdown: pendingCountdownFromIso(latestPending.scannedAt, now),
    };
  }

  const cooldownSec = resolveCooldownSecondsLeft({
    lastScanAt,
    recentScans,
    now,
  });

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
