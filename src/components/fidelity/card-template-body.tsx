import type { ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import ClientStampGrid from "@/components/client/stamp-grid";
import {
  cardTemplateClassName,
  getCardTemplate,
  type CardTemplate,
} from "@/lib/card-templates";
import type { StampMilestone } from "@/lib/stamp-milestones";
import type { RewardMode } from "@/lib/spend-rewards";
import { formatDzd } from "@/lib/pricing";
import { readableAccentColor } from "@/lib/card-color-contrast";
import CartaCardWatermark from "@/components/fidelity/carta-card-watermark";
import { cn } from "@/lib/utils";

type CardTemplateBodyProps = {
  cardDesignId?: string | null;
  primaryColor: string;
  secondaryColor: string;
  cardBg: string | null;
  qrValue: string;
  qrSize?: number;
  rewardMode?: RewardMode;
  stampsEnabled?: boolean;
  spendEnabled?: boolean;
  stampThreshold: number;
  currentStamps: number;
  spendThresholdDzd?: number;
  currentCycleSpendDzd?: number;
  milestones: StampMilestone[];
  progress: number;
  spendProgress?: number;
  hint?: string | null;
  spendHint?: string | null;
  progressLabel?: string;
  spendProgressLabel?: string;
  footerHint?: string;
  compact?: boolean;
  animated?: boolean;
  showWatermark?: boolean;
  scanLimitActive?: boolean;
  scanLimitCountdown?: string;
  scanLimitLabel?: string;
};

function ProgressBar({
  progress,
  primaryColor,
  secondaryColor,
  template,
  animated,
}: {
  progress: number;
  primaryColor: string;
  secondaryColor: string;
  template: CardTemplate;
  animated?: boolean;
}) {
  const bar = (
    <div
      className="card-tpl-progress-track"
      style={
        template.progressStyle === "segmented"
          ? { backgroundImage: `repeating-linear-gradient(90deg, #e5e7eb 0, #e5e7eb 8px, transparent 8px, transparent 12px)` }
          : undefined
      }
    >
      {animated ? (
        <motion.div
          className="card-tpl-progress-fill"
          style={{
            backgroundColor: template.progressStyle === "gradient" ? undefined : primaryColor,
            backgroundImage:
              template.progressStyle === "gradient"
                ? `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`
                : undefined,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        />
      ) : (
        <div
          className="card-tpl-progress-fill"
          style={{
            backgroundColor: template.progressStyle === "gradient" ? undefined : primaryColor,
            backgroundImage:
              template.progressStyle === "gradient"
                ? `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`
                : undefined,
            width: `${progress}%`,
          }}
        />
      )}
    </div>
  );

  return bar;
}

function QrBlock({
  qrValue,
  qrSize,
  className,
  animated,
  scanLimitActive,
  scanLimitCountdown,
  scanLimitLabel,
}: {
  qrValue: string;
  qrSize: number;
  className?: string;
  animated?: boolean;
  scanLimitActive?: boolean;
  scanLimitCountdown?: string;
  scanLimitLabel?: string;
}) {
  const inner = (
    <div className={`card-tpl-qr-box relative ${className ?? ""}`}>
      <div className={scanLimitActive ? "blur-md scale-[0.98] opacity-60 pointer-events-none select-none" : undefined}>
        <QRCodeSVG value={qrValue} size={qrSize} level={animated ? "H" : "M"} fgColor="#111" />
      </div>
      {scanLimitActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white/90 backdrop-blur-md px-3 text-center">
          <p className="text-xs font-medium text-muted-foreground leading-snug">{scanLimitLabel}</p>
          <p className="text-2xl font-bold tabular-nums mt-1.5 text-foreground tracking-tight">
            {scanLimitCountdown}
          </p>
        </div>
      )}
    </div>
  );

  if (!animated) return inner;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 340, damping: 28, delay: 0.12 }}
    >
      {inner}
    </motion.div>
  );
}

function DetailsPanel({
  template,
  primaryColor,
  children,
}: {
  template: CardTemplate;
  primaryColor: string;
  children: ReactNode;
}) {
  return (
    <div
      className="card-tpl-panel"
      style={
        template.layout === "dark" || template.layout === "contrast"
          ? { borderColor: `${primaryColor}40` }
          : undefined
      }
    >
      {children}
    </div>
  );
}

export default function CardTemplateBody({
  cardDesignId,
  primaryColor,
  secondaryColor,
  cardBg,
  qrValue,
  qrSize,
  rewardMode = "stamps",
  stampsEnabled,
  spendEnabled,
  stampThreshold,
  currentStamps,
  spendThresholdDzd = 10000,
  currentCycleSpendDzd = 0,
  milestones,
  progress,
  spendProgress,
  hint,
  spendHint,
  progressLabel = "Progression",
  spendProgressLabel = "Dépenses",
  footerHint,
  compact = false,
  animated = false,
  showWatermark = false,
  scanLimitActive = false,
  scanLimitCountdown,
  scanLimitLabel,
}: CardTemplateBodyProps) {
  const showStamps = stampsEnabled ?? (rewardMode === "stamps" || rewardMode === "both");
  const showSpend = spendEnabled ?? (rewardMode === "spend" || rewardMode === "both");
  const template = getCardTemplate(cardDesignId);
  const size = qrSize ?? (compact ? 148 : 188);
  const tplClass = cardTemplateClassName(template);
  const spendBarProgress = spendProgress ?? progress;
  const accentColor = readableAccentColor(primaryColor, cardDesignId);

  const bgStyle = cardBg
    ? { backgroundImage: `url(${cardBg})`, opacity: 0.75 }
    : {
        background: `linear-gradient(135deg, ${primaryColor}33 0%, ${secondaryColor}22 50%, #ffffff88 100%)`,
        opacity: 1,
      };

  const stampProgressBlock = showStamps && !showSpend ? (
    <>
      <div className="card-tpl-progress-head">
        <span className="card-tpl-progress-label">{progressLabel}</span>
        <span className="card-tpl-progress-count" style={{ color: accentColor }}>
          {`${currentStamps}/${stampThreshold}`}
        </span>
      </div>
      <ProgressBar
        progress={progress}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        template={template}
        animated={animated}
      />
    </>
  ) : null;

  const spendProgressBlock = showSpend ? (
    <>
      <div className="card-tpl-progress-head">
        <span className="card-tpl-progress-label">{spendProgressLabel}</span>
        <span className="card-tpl-progress-count" style={{ color: accentColor }}>
          {`${formatDzd(currentCycleSpendDzd)} / ${formatDzd(spendThresholdDzd)}`}
        </span>
      </div>
      <ProgressBar
        progress={spendBarProgress}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        template={template}
        animated={animated}
      />
    </>
  ) : null;

  const stampsBlock = showStamps ? (
    <ClientStampGrid
      stampThreshold={stampThreshold}
      currentStamps={currentStamps}
      milestones={milestones}
      primaryColor={primaryColor}
      compact={compact}
      template={template}
    />
  ) : null;

  const hintBlock =
    hint &&
    (animated ? (
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.35 }}
        className="card-tpl-hint"
      >
        {hint}
      </motion.p>
    ) : (
      <p className="card-tpl-hint">{hint}</p>
    ));

  const spendHintBlock =
    spendHint &&
    (animated ? (
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.35 }}
        className="card-tpl-hint"
      >
        {spendHint}
      </motion.p>
    ) : (
      <p className="card-tpl-hint">{spendHint}</p>
    ));

  const footerBlock = footerHint && <p className="card-tpl-footer">{footerHint}</p>;

  const isSplit = template.layout === "split";
  const ribbonLabel = showStamps && showSpend
    ? `${progressLabel} · ${spendProgressLabel}`
    : showSpend
      ? spendProgressLabel
      : progressLabel;
  const ribbonCount = showStamps && showSpend
    ? `${currentStamps}/${stampThreshold} · ${formatDzd(currentCycleSpendDzd)}`
    : showSpend
      ? `${formatDzd(currentCycleSpendDzd)} / ${formatDzd(spendThresholdDzd)}`
      : `${currentStamps}/${stampThreshold}`;

  return (
    <div className={cn(showWatermark && "card-tpl-wrap")}>
      <div className={`card-tpl-surface card-tpl ${tplClass}`}>
      <div className="card-tpl-bg absolute inset-0 bg-cover bg-center pointer-events-none" style={bgStyle} />
      <div className="card-tpl-overlay absolute inset-0 pointer-events-none" />

      {template.layout === "ribbon" && (
        <div className="card-tpl-ribbon relative" style={{ backgroundColor: primaryColor }}>
          <span>{ribbonLabel}</span>
          <strong>{ribbonCount}</strong>
        </div>
      )}

      {template.layout === "banner" && (
        <div
          className="card-tpl-top-banner relative"
          style={{ background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})` }}
        >
          <span>{ribbonLabel}</span>
        </div>
      )}

      <div className={`card-tpl-inner relative ${isSplit ? "card-tpl-inner--split" : ""}`}>
        <div className="card-tpl-qr-wrap">
          <QrBlock
            qrValue={qrValue}
            qrSize={size}
            animated={animated}
            scanLimitActive={scanLimitActive}
            scanLimitCountdown={scanLimitCountdown}
            scanLimitLabel={scanLimitLabel}
          />
        </div>

        <DetailsPanel template={template} primaryColor={primaryColor}>
          {template.layout !== "ribbon" && (
            <>
              {stampProgressBlock}
              {spendProgressBlock}
            </>
          )}
          {hintBlock}
          {spendHintBlock}
          {stampsBlock}
          {footerBlock}
        </DetailsPanel>
      </div>
      </div>

      {showWatermark && <CartaCardWatermark placement="card" />}
    </div>
  );
}
