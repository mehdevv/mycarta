type CooldownScan = {
  scannedAt: string;
  status: string;
};

/** Short cooldown after a successful scan — same employee cannot re-scan during this window. */
export const SAME_WORKER_SCAN_COOLDOWN_MS = 10_000;

export function findLastApprovedScan(
  recentScans?: CooldownScan[],
): CooldownScan | undefined {
  return recentScans?.find((scan) => scan.status === "approved");
}

export function scanCooldownSecondsLeft(
  scannedAt: string | undefined,
  status: string | undefined,
  now: number,
): number {
  if (!scannedAt || status !== "approved") return 0;

  const age = now - new Date(scannedAt).getTime();
  if (!Number.isFinite(age) || age < 0 || age >= SAME_WORKER_SCAN_COOLDOWN_MS) return 0;
  return Math.ceil((SAME_WORKER_SCAN_COOLDOWN_MS - age) / 1000);
}

export function scanCooldownSecondsLeftFromRecent(
  recentScans: CooldownScan[] | undefined,
  now: number,
): number {
  const anchor = findLastApprovedScan(recentScans);
  if (!anchor) return 0;
  return scanCooldownSecondsLeft(anchor.scannedAt, anchor.status, now);
}
