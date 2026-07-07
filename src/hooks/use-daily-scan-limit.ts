import { useEffect, useMemo, useRef, useState } from "react";
import { formatScanLimitCountdown } from "@/lib/scan-limit-countdown";

export function useDailyScanLimit(
  scansToday?: number,
  maxScansPerDay?: number,
  scansResetAt?: string | null,
  onExpired?: () => void,
) {
  const limit = maxScansPerDay ?? 2;
  const used = scansToday ?? 0;
  const limitReached = limit > 0 && used >= limit;

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!limitReached || !scansResetAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [limitReached, scansResetAt]);

  const resetAtMs = scansResetAt ? new Date(scansResetAt).getTime() : 0;
  const secondsLeft = useMemo(() => {
    if (!limitReached || !scansResetAt) return 0;
    return Math.max(0, Math.ceil((resetAtMs - now) / 1000));
  }, [limitReached, scansResetAt, resetAtMs, now]);

  const active = limitReached && secondsLeft > 0;
  const prevSecondsRef = useRef(secondsLeft);

  useEffect(() => {
    if (limitReached && prevSecondsRef.current > 0 && secondsLeft === 0) {
      onExpired?.();
    }
    prevSecondsRef.current = secondsLeft;
  }, [limitReached, secondsLeft, onExpired]);

  return {
    active,
    secondsLeft,
    countdownLabel: formatScanLimitCountdown(secondsLeft),
    scansToday: used,
    maxScansPerDay: limit,
  };
}
