/** Short cooldown after a scan — same employee cannot re-scan during this window. */
export const SAME_WORKER_SCAN_COOLDOWN_MS = 10_000;

export function scanCooldownSecondsLeft(
  scannedAt: string | undefined,
  status: string | undefined,
  blockReason: string | undefined,
  now: number,
): number {
  if (!scannedAt) return 0;

  const eligible =
    status === "approved" ||
    status === "pending" ||
    (status === "blocked_fraud" && blockReason === "too_soon");

  if (!eligible) return 0;

  const age = now - new Date(scannedAt).getTime();
  if (!Number.isFinite(age) || age < 0 || age >= SAME_WORKER_SCAN_COOLDOWN_MS) return 0;
  return Math.ceil((SAME_WORKER_SCAN_COOLDOWN_MS - age) / 1000);
}
