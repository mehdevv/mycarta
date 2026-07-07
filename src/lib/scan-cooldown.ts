/** Short cooldown after a successful scan — same employee cannot re-scan during this window. */
export const SAME_WORKER_SCAN_COOLDOWN_MS = 10_000;

type CooldownScan = {
  scannedAt: string;
  status: string;
};

export function scanCooldownSecondsLeftFromTimestamp(
  scannedAt: string | null | undefined,
  now: number,
): number {
  if (!scannedAt) return 0;
  const age = now - new Date(scannedAt).getTime();
  if (!Number.isFinite(age) || age < 0 || age >= SAME_WORKER_SCAN_COOLDOWN_MS) return 0;
  return Math.ceil((SAME_WORKER_SCAN_COOLDOWN_MS - age) / 1000);
}

export function findLastApprovedScan(
  recentScans?: CooldownScan[],
): CooldownScan | undefined {
  return recentScans?.find((scan) => scan.status === "approved");
}

export function scanCooldownSecondsLeftFromRecent(
  recentScans: CooldownScan[] | undefined,
  now: number,
): number {
  const anchor = findLastApprovedScan(recentScans);
  if (!anchor?.scannedAt) return 0;
  return scanCooldownSecondsLeftFromTimestamp(anchor.scannedAt, now);
}

export function resolveCooldownSecondsLeft(args: {
  lastScanAt?: string | null;
  recentScans?: CooldownScan[];
  now: number;
}): number {
  const fromLastScan = scanCooldownSecondsLeftFromTimestamp(args.lastScanAt, args.now);
  const fromRecent = scanCooldownSecondsLeftFromRecent(args.recentScans, args.now);
  return Math.max(fromLastScan, fromRecent);
}
