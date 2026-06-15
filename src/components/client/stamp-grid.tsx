import { motion } from "framer-motion";
import { CheckCircle2, Gift } from "lucide-react";
import { getMilestoneAt, type StampMilestone } from "@/lib/stamp-milestones";
import { staggerContainer, staggerItem, reducedMotion } from "@/lib/motion";

type Props = {
  stampThreshold: number;
  currentStamps: number;
  milestones: StampMilestone[];
  primaryColor: string;
  compact?: boolean;
};

const nextFlash = (primaryColor: string) =>
  reducedMotion
    ? {}
    : {
        scale: [1, 1.07, 1],
        boxShadow: [
          "0 2px 8px rgba(0,0,0,0.08)",
          `0 0 0 5px ${primaryColor}40, 0 4px 16px ${primaryColor}30`,
          "0 2px 8px rgba(0,0,0,0.08)",
        ],
      };

const prizeFlash = reducedMotion
  ? {}
  : {
      scale: [1, 1.05, 1],
      boxShadow: [
        "0 2px 6px rgba(245,158,11,0.2)",
        "0 0 14px rgba(245,158,11,0.55), 0 0 0 3px rgba(245,158,11,0.25)",
        "0 2px 6px rgba(245,158,11,0.2)",
      ],
    };

const fillPop = reducedMotion ? {} : { scale: [0.7, 1.12, 1] };

export default function ClientStampGrid({
  stampThreshold,
  currentStamps,
  milestones,
  primaryColor,
  compact = false,
}: Props) {
  const stamps = Array.from({ length: stampThreshold });

  return (
    <motion.div
      className={`grid grid-cols-5 ${compact ? "gap-2" : "gap-3"}`}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {stamps.map((_, i) => {
        const position = i + 1;
        const filled = i < currentStamps;
        const prize = getMilestoneAt(milestones, position);
        const isNext = !filled && position === currentStamps + 1;
        const isPrize = !!prize && !filled && !isNext;
        const isJustFilled = filled && position === currentStamps;

        const pulseAnimate = isNext
          ? nextFlash(primaryColor)
          : isPrize
            ? prizeFlash
            : isJustFilled
              ? fillPop
              : {};

        const pulseTransition = isNext || isPrize
          ? { duration: 1.6, repeat: Infinity, ease: [0.45, 0, 0.55, 1] as const }
          : { type: "spring" as const, stiffness: 480, damping: 16 };

        return (
          <motion.div
            key={position}
            variants={staggerItem}
            className={`flex flex-col items-center gap-1 ${compact ? "min-h-[3.5rem]" : "min-h-[4.5rem]"}`}
          >
            <motion.div
              className={`w-full aspect-square rounded-full flex items-center justify-center border-2 shadow-sm ${
                isNext ? "ring-2 ring-offset-2 ring-offset-white" : ""
              } ${isPrize ? "ring-1 ring-amber-300/60" : ""}`}
              style={{
                borderColor: filled ? primaryColor : prize ? "#F59E0B" : "#D1D5DB",
                backgroundColor: filled
                  ? `${primaryColor}18`
                  : prize
                    ? "#FEF3C7"
                    : "rgba(255,255,255,0.95)",
                ringColor: isNext ? `${primaryColor}70` : undefined,
              }}
              animate={pulseAnimate}
              transition={pulseTransition}
            >
              {filled ? (
                <motion.div
                  initial={isJustFilled && !reducedMotion ? { scale: 0, rotate: -120 } : false}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 14 }}
                >
                  <CheckCircle2
                    className={compact ? "w-5 h-5" : "w-6 h-6"}
                    style={{ color: primaryColor }}
                  />
                </motion.div>
              ) : prize ? (
                <motion.div
                  animate={
                    reducedMotion || isNext
                      ? {}
                      : { rotate: [0, -8, 8, 0], scale: [1, 1.1, 1] }
                  }
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Gift className={compact ? "w-4 h-4 text-amber-600" : "w-5 h-5 text-amber-600"} />
                </motion.div>
              ) : (
                <span className="text-xs font-bold text-gray-500">{position}</span>
              )}
            </motion.div>
            {prize && (
              <motion.span
                className="text-[10px] text-center leading-tight font-semibold text-amber-800 line-clamp-2 w-full"
                animate={
                  isPrize && !reducedMotion
                    ? { opacity: [0.75, 1, 0.75] }
                    : { opacity: 1 }
                }
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              >
                {prize.label}
              </motion.span>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}

export function nextMilestoneHint(
  currentStamps: number,
  stampThreshold: number,
  milestones: StampMilestone[],
): string | null {
  const upcoming = milestones
    .filter((m) => m.position > currentStamps && m.position <= stampThreshold)
    .sort((a, b) => a.position - b.position)[0];
  if (!upcoming) return null;
  const remaining = upcoming.position - currentStamps;
  return `${remaining} more stamp${remaining === 1 ? "" : "s"} until: ${upcoming.label}`;
}
