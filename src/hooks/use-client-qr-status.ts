import { useEffect, useMemo, useState } from "react";
import type { ClientCard } from "@/api/types";
import { resolveClientQrBlockingStatus } from "@/lib/client-qr-status";
import { useDailyScanLimit } from "@/hooks/use-daily-scan-limit";

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

export function useClientQrStatus(
  card: Pick<ClientCard, "scansToday" | "maxScansPerDay" | "scansResetAt" | "recentScans"> | null | undefined,
  t: TranslateFn,
  onLimitExpired?: () => void,
) {
  const scanLimit = useDailyScanLimit(
    card?.scansToday,
    card?.maxScansPerDay,
    card?.scansResetAt,
    onLimitExpired,
  );

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const blockingStatus = useMemo(
    () =>
      resolveClientQrBlockingStatus({
        scanLimitActive: scanLimit.active,
        scanLimitCountdown: scanLimit.countdownLabel,
        scanLimitSecondsLeft: scanLimit.secondsLeft,
        scansResetAt: card?.scansResetAt,
        scansToday: scanLimit.scansToday,
        maxScansPerDay: scanLimit.maxScansPerDay,
        recentScans: card?.recentScans,
        now,
        t,
      }),
    [
      scanLimit.active,
      scanLimit.countdownLabel,
      scanLimit.secondsLeft,
      card?.scansResetAt,
      scanLimit.scansToday,
      scanLimit.maxScansPerDay,
      card?.recentScans,
      now,
      t,
    ],
  );

  return { blockingStatus, scanLimit };
}
