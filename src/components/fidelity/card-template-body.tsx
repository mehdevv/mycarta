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

type CardTemplateBodyProps = {
  cardDesignId?: string | null;
  primaryColor: string;
  secondaryColor: string;
  cardBg: string | null;
  qrValue: string;
  qrSize?: number;
  stampThreshold: number;
  currentStamps: number;
  milestones: StampMilestone[];
  progress: number;
  hint?: string | null;
  progressLabel?: string;
  footerHint?: string;
  compact?: boolean;
  animated?: boolean;
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
}: {
  qrValue: string;
  qrSize: number;
  className?: string;
  animated?: boolean;
}) {
  const inner = (
    <div className={`card-tpl-qr-box ${className ?? ""}`}>
      <QRCodeSVG value={qrValue} size={qrSize} level="H" fgColor="#111" />
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
  stampThreshold,
  currentStamps,
  milestones,
  progress,
  hint,
  progressLabel = "Progression",
  footerHint,
  compact = false,
  animated = false,
}: CardTemplateBodyProps) {
  const template = getCardTemplate(cardDesignId);
  const size = qrSize ?? (compact ? 148 : 188);
  const tplClass = cardTemplateClassName(template);

  const bgStyle = cardBg
    ? { backgroundImage: `url(${cardBg})`, opacity: 0.75 }
    : {
        background: `linear-gradient(135deg, ${primaryColor}33 0%, ${secondaryColor}22 50%, #ffffff88 100%)`,
        opacity: 1,
      };

  const progressBlock = (
    <>
      <div className="card-tpl-progress-head">
        <span className="card-tpl-progress-label">{progressLabel}</span>
        <span className="card-tpl-progress-count" style={{ color: primaryColor }}>
          {currentStamps}/{stampThreshold}
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
  );

  const stampsBlock = (
    <ClientStampGrid
      stampThreshold={stampThreshold}
      currentStamps={currentStamps}
      milestones={milestones}
      primaryColor={primaryColor}
      compact={compact}
      template={template}
    />
  );

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

  const footerBlock = footerHint && <p className="card-tpl-footer">{footerHint}</p>;

  const isSplit = template.layout === "split";

  return (
    <div className={`card-tpl-surface card-tpl ${tplClass}`}>
      <div className="card-tpl-bg absolute inset-0 bg-cover bg-center pointer-events-none" style={bgStyle} />
      <div className="card-tpl-overlay absolute inset-0 pointer-events-none" />

      {template.layout === "ribbon" && (
        <div className="card-tpl-ribbon relative" style={{ backgroundColor: primaryColor }}>
          <span>{progressLabel}</span>
          <strong>
            {currentStamps}/{stampThreshold}
          </strong>
        </div>
      )}

      {template.layout === "banner" && (
        <div
          className="card-tpl-top-banner relative"
          style={{ background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})` }}
        >
          <span>{progressLabel}</span>
        </div>
      )}

      <div className={`card-tpl-inner relative ${isSplit ? "card-tpl-inner--split" : ""}`}>
        <div className="card-tpl-qr-wrap">
          <QrBlock qrValue={qrValue} qrSize={size} animated={animated} />
        </div>

        <DetailsPanel template={template} primaryColor={primaryColor}>
          {template.layout !== "ribbon" && progressBlock}
          {hintBlock}
          {stampsBlock}
          {footerBlock}
        </DetailsPanel>
      </div>
    </div>
  );
}
