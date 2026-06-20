import { motion } from "framer-motion";
import BrandLogo from "@/components/brand/mascot";
import ClientShell from "@/components/client/client-shell";
import CardTemplateBody from "@/components/fidelity/card-template-body";
import { normalizeAssetUrl } from "@/hooks/use-branding";
import { cardReveal, headerItem, headerStagger } from "@/lib/motion";
import type { StampMilestone } from "@/lib/stamp-milestones";

type FidelityCardPreviewProps = {
  businessName: string;
  clientName?: string;
  logoUrl: string | null;
  cardTemplateUrl: string | null;
  cardDesignId?: string | null;
  primaryColor: string;
  secondaryColor: string;
  stampThreshold: number;
  currentStamps: number;
  milestones: StampMilestone[];
  showCustomBg?: boolean;
};

export default function FidelityCardPreview({
  businessName,
  clientName = "Client exemple",
  logoUrl,
  cardTemplateUrl,
  cardDesignId,
  primaryColor,
  secondaryColor,
  stampThreshold,
  currentStamps,
  milestones,
  showCustomBg = true,
}: FidelityCardPreviewProps) {
  const cardBg = showCustomBg ? normalizeAssetUrl(cardTemplateUrl) : null;
  const progress = Math.min(100, (currentStamps / stampThreshold) * 100);
  const nextMilestone = milestones.find((m) => m.position > currentStamps);
  const hint = nextMilestone
    ? currentStamps === nextMilestone.position - 1
      ? `1 tampon de plus pour : ${nextMilestone.label}`
      : `${nextMilestone.position - currentStamps} tampon(s) avant : ${nextMilestone.label}`
    : null;

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
                  stampThreshold={stampThreshold}
                  currentStamps={currentStamps}
                  milestones={milestones}
                  progress={progress}
                  hint={hint}
                  progressLabel="Progression"
                  footerHint="Présentez ce QR au comptoir pour gagner des tampons"
                  compact
                  animated
                />
              </motion.div>
            </div>
          </motion.div>
        </ClientShell>
      </div>
    </div>
  );
}
