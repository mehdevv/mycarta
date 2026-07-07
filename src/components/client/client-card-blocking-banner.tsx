import { Clock, Loader2, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import type { ClientQrBlockingStatus } from "@/lib/client-qr-status";
import { cn } from "@/lib/utils";

type ClientCardBlockingBannerProps = {
  status: ClientQrBlockingStatus;
  animated?: boolean;
};

export default function ClientCardBlockingBanner({
  status,
  animated = true,
}: ClientCardBlockingBannerProps) {
  const icon =
    status.variant === "pending" ? (
      <Loader2 className="h-5 w-5 animate-spin" />
    ) : status.variant === "cooldown" ? (
      <Clock className="h-5 w-5" />
    ) : (
      <ShieldAlert className="h-5 w-5" />
    );

  const tone =
    status.variant === "pending"
      ? "border-primary/25 bg-primary/5 text-primary"
      : status.variant === "cooldown"
        ? "border-orange-200 bg-orange-50 text-orange-900"
        : "border-amber-200 bg-amber-50 text-amber-950";

  const iconBg =
    status.variant === "pending"
      ? "bg-primary/15"
      : status.variant === "cooldown"
        ? "bg-orange-100"
        : "bg-amber-100";

  const inner = (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 shadow-sm",
        tone,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            iconBg,
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">{status.reason}</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-[11px] font-medium uppercase tracking-wide opacity-80">
              {status.countdownLabel}
            </span>
            <span className="text-2xl font-bold tabular-nums tracking-tight">
              {status.countdown}
            </span>
          </div>
          {status.hint && (
            <p className="mt-2 text-xs leading-snug opacity-80">{status.hint}</p>
          )}
        </div>
      </div>
    </div>
  );

  if (!animated) return <div className="mb-4">{inner}</div>;

  return (
    <motion.div
      className="mb-4"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {inner}
    </motion.div>
  );
}
