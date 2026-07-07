/** Minimum seconds between loyalty scans for the same customer. */
export const SCAN_COOLDOWN_MS = 60_000;

export function scanCooldownSecondsLeft(
  scannedAt: string | undefined,
  status: string | undefined,
  now: number,
): number {
  if (!scannedAt || status !== "approved") return 0;
  const age = now - new Date(scannedAt).getTime();
  if (!Number.isFinite(age) || age < 0 || age >= SCAN_COOLDOWN_MS) return 0;
  return Math.ceil((SCAN_COOLDOWN_MS - age) / 1000);
}
