import { motion } from "framer-motion";
import BrandLogo from "@/components/brand/mascot";
import ClientShell from "@/components/client/client-shell";
import CardTemplateBody from "@/components/fidelity/card-template-body";
import { normalizeAssetUrl } from "@/hooks/use-branding";
import { cardReveal, headerItem, headerStagger } from "@/lib/motion";
import type { StampMilestone } from "@/lib/stamp-milestones";
import { spendProgressPercent, spendRemainingDzd } from "@/lib/spend-rewards";
import { formatDzd } from "@/lib/pricing";

type FidelityCardPreviewProps = {
  businessName: string;
  clientName?: string;
  logoUrl: string | null;
  cardTemplateUrl: string | null;
  cardDesignId?: string | null;
  primaryColor: string;
  secondaryColor: string;
  stampsEnabled?: boolean;
  spendEnabled?: boolean;
  stampThreshold: number;
  currentStamps: number;
  spendThresholdDzd?: number;
  currentCycleSpendDzd?: number;
  rewardValue?: string;
  milestones: StampMilestone[];
  showCustomBg?: boolean;
  showWatermark?: boolean;
};

export default function FidelityCardPreview({
  businessName,
  clientName = "Client exemple",
  logoUrl,
  cardTemplateUrl,
  cardDesignId,
  primaryColor,
  secondaryColor,
  stampsEnabled = true,
  spendEnabled = false,
  stampThreshold,
  currentStamps,
  spendThresholdDzd = 10000,
  currentCycleSpendDzd = 0,
  rewardValue = "",
  milestones,
  showCustomBg = true,
  showWatermark = false,
}: FidelityCardPreviewProps) {
  const cardBg = showCustomBg ? normalizeAssetUrl(cardTemplateUrl) : null;
  const stampProgress = Math.min(100, (currentStamps / stampThreshold) * 100);
  const spendProgress = spendProgressPercent(currentCycleSpendDzd, spendThresholdDzd);
  const nextMilestone = milestones.find((m) => m.position > currentStamps);
  const stampHint = nextMilestone
    ? currentStamps === nextMilestone.position - 1
      ? `1 tampon de plus pour : ${nextMilestone.label}`
      : `${nextMilestone.position - currentStamps} tampon(s) avant : ${nextMilestone.label}`
    : null;
  const spendHint = spendEnabled
    ? rewardValue.trim()
      ? `Encore ${formatDzd(spendRemainingDzd(currentCycleSpendDzd, spendThresholdDzd))} pour : ${rewardValue.trim()}`
      : `Encore ${formatDzd(spendRemainingDzd(currentCycleSpendDzd, spendThresholdDzd))} avant la récompense`
    : null;

  const footerHint =
    stampsEnabled && spendEnabled
      ? "Tampons et dépenses cumulés pour débloquer vos récompenses"
      : spendEnabled
        ? "Vos achats sont cumulés pour débloquer la récompense"
        : "Présentez ce QR au comptoir pour gagner des tampons";

  return (
    <div className="fidelity-card-phone">
      <div className="fidelity-card-phone-notch" aria-hidden />
      <div className="fidelity-card-phone-screen">
        <ClientShell
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          className="!min-h-0 h-full"
        >
          <motion.div
            className="flex flex-col w-full pb-5"
            variants={headerStagger}
            initial="initial"
            animate="animate"
          >
            <motion.header
              className="px-4 pt-3 pb-2 flex items-center gap-2.5 min-w-0"
              variants={headerItem}
            >
              <BrandLogo
                role="client"
                size="xs"
                animate={false}
                className="shrink-0"
                logoUrl={logoUrl}
                alt={businessName}
                primaryColor={primaryColor}
              />
              <div className="min-w-0">
                <h1 className="text-base font-bold leading-tight truncate text-foreground drop-shadow-sm">
                  {clientName}
                </h1>
                <p
                  className="text-[10px] font-semibold uppercase tracking-wide truncate"
                  style={{ color: primaryColor }}
                >
                  {businessName || "Ma boutique"}
                </p>
              </div>
            </motion.header>

            <div className="px-4">
              <motion.div variants={cardReveal} initial="initial" animate="animate">
                <CardTemplateBody
                  cardDesignId={cardDesignId}
                  primaryColor={primaryColor}
                  secondaryColor={secondaryColor}
                  cardBg={cardBg}
                  qrValue="preview-card"
                  stampsEnabled={stampsEnabled}
                  spendEnabled={spendEnabled}
                  stampThreshold={stampThreshold}
                  currentStamps={currentStamps}
                  spendThresholdDzd={spendThresholdDzd}
                  currentCycleSpendDzd={currentCycleSpendDzd}
                  milestones={milestones}
                  progress={stampProgress}
                  spendProgress={spendProgress}
                  hint={stampsEnabled ? stampHint : null}
                  spendHint={spendEnabled ? spendHint : null}
                  progressLabel="Progression"
                  spendProgressLabel="Dépenses"
                  footerHint={footerHint}
                  compact
                  animated
                  showWatermark={showWatermark}
                />
              </motion.div>
            </div>
          </motion.div>
        </ClientShell>
      </div>
    </div>
  );
}
