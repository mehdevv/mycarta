import { motion } from "framer-motion";
import { CheckCircle2, Gift, Star, Trophy } from "lucide-react";
import { getMilestoneAt, type StampMilestone } from "@/lib/stamp-milestones";
import { getCardTemplate, stampGridClassName, type CardTemplate } from "@/lib/card-templates";
import { staggerContainer, staggerItem, reducedMotion } from "@/lib/motion";

type Props = {
  stampThreshold: number;
  currentStamps: number;
  milestones: StampMilestone[];
  primaryColor: string;
  compact?: boolean;
  template?: CardTemplate | string;
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

const grandPrizeFlash = reducedMotion
  ? {}
  : {
      scale: [1, 1.08, 1],
      boxShadow: [
        "0 2px 8px rgba(124,58,237,0.25)",
        "0 0 18px rgba(124,58,237,0.55), 0 0 0 4px rgba(124,58,237,0.2)",
        "0 2px 8px rgba(124,58,237,0.25)",
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
  template: templateProp,
}: Props) {
  const template =
    typeof templateProp === "string" || templateProp == null
      ? getCardTemplate(typeof templateProp === "string" ? templateProp : undefined)
      : templateProp;

  const stamps = Array.from({ length: stampThreshold });
  const cols = template.stampColumns;
  const gridClass = stampGridClassName(template);

  return (
    <motion.div
      className={`${gridClass} grid ${compact ? "gap-2" : "gap-3"}`}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {stamps.map((_, i) => {
        const position = i + 1;
        const filled = i < currentStamps;
        const prize = getMilestoneAt(milestones, position);
        const isGrandPrize = position === stampThreshold && !!prize;
        const isNext = !filled && position === currentStamps + 1;
        const isPrize = !!prize && !filled && !isNext;
        const isJustFilled = filled && position === currentStamps;

        const pulseAnimate = isGrandPrize
          ? grandPrizeFlash
          : isNext
            ? nextFlash(primaryColor)
            : isPrize
              ? prizeFlash
              : isJustFilled
                ? fillPop
                : {};

        const pulseTransition =
          isGrandPrize || isNext || isPrize
            ? { duration: 1.6, repeat: Infinity, ease: [0.45, 0, 0.55, 1] as const }
            : { type: "spring" as const, stiffness: 480, damping: 16 };

        const shapeStyle: React.CSSProperties = {
          borderColor: filled
            ? primaryColor
            : isGrandPrize
              ? "#7C3AED"
              : prize
                ? "#F59E0B"
                : "#D1D5DB",
          backgroundColor: filled
            ? `${primaryColor}18`
            : isGrandPrize
              ? "#EDE9FE"
              : prize
                ? "#FEF3C7"
                : template.stampStyle === "neon"
                  ? "rgba(15,23,42,0.5)"
                  : "rgba(255,255,255,0.95)",
          color: template.stampStyle === "neon" ? primaryColor : undefined,
          ...(isNext ? { boxShadow: `0 0 0 3px ${primaryColor}40` } : {}),
          ...(isGrandPrize ? { boxShadow: "0 0 0 2px rgba(124,58,237,0.35)" } : {}),
        };

        return (
          <motion.div
            key={position}
            variants={staggerItem}
            className={`flex flex-col items-center gap-1 ${compact ? "min-h-[3.5rem]" : "min-h-[4.5rem]"}`}
          >
            <motion.div
              className={`stamp-cell-shape ${
                isGrandPrize
                  ? "ring-2 ring-violet-400/70"
                  : isPrize
                    ? "ring-1 ring-amber-300/60"
                    : ""
              }`}
              style={shapeStyle}
              animate={pulseAnimate}
              transition={pulseTransition}
            >
              {filled ? (
                <motion.div
                  initial={isJustFilled && !reducedMotion ? { scale: 0, rotate: -120 } : false}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 14 }}
                >
                  {template.stampStyle === "star" ? (
                    <Star
                      className={compact ? "w-5 h-5" : "w-6 h-6"}
                      fill={primaryColor}
                      style={{ color: primaryColor }}
                    />
                  ) : (
                    <CheckCircle2
                      className={compact ? "w-5 h-5" : "w-6 h-6"}
                      style={{ color: primaryColor }}
                    />
                  )}
                </motion.div>
              ) : prize ? (
                <motion.div
                  animate={
                    reducedMotion || isNext
                      ? {}
                      : { rotate: isGrandPrize ? [0, -5, 5, 0] : [0, -8, 8, 0], scale: [1, 1.1, 1] }
                  }
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                >
                  {isGrandPrize ? (
                    <Trophy
                      className={compact ? "w-4 h-4 text-violet-600" : "w-5 h-5 text-violet-600"}
                    />
                  ) : (
                    <Gift className={compact ? "w-4 h-4 text-amber-600" : "w-5 h-5 text-amber-600"} />
                  )}
                </motion.div>
              ) : template.stampStyle === "star" ? (
                <Star className={compact ? "w-4 h-4 text-gray-400" : "w-5 h-5 text-gray-400"} />
              ) : template.stampStyle === "dot" ? (
                <span
                  className="rounded-full"
                  style={{
                    width: compact ? 8 : 10,
                    height: compact ? 8 : 10,
                    backgroundColor: "#9ca3af",
                  }}
                />
              ) : (
                <span className="text-xs font-bold text-gray-500">{position}</span>
              )}
            </motion.div>
            {prize && template.showMilestoneLabels && (
              <motion.span
                className={`text-[10px] text-center leading-tight font-semibold line-clamp-2 w-full ${
                  isGrandPrize ? "text-violet-800" : "text-amber-800"
                }`}
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
