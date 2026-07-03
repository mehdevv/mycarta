import { useMemo } from "react";
import { motion } from "framer-motion";
import { PartyPopper, Sparkles } from "lucide-react";
import CardTemplateBody from "@/components/fidelity/card-template-body";
import type { StampMilestone } from "@/lib/stamp-milestones";

type CelebrationConfettiProps = {
  colors: string[];
};

function CelebrationConfetti({ colors }: CelebrationConfettiProps) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        x: 4 + Math.random() * 92,
        delay: Math.random() * 0.55,
        duration: 2.2 + Math.random() * 1.4,
        color: colors[i % colors.length],
        rotation: Math.random() * 540 - 180,
        w: 5 + Math.random() * 7,
        h: 3 + Math.random() * 5,
        round: Math.random() > 0.5,
      })),
    [colors],
  );

  return (
    <div className="onboarding-confetti" aria-hidden>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="onboarding-confetti-piece"
          style={{
            left: `${p.x}%`,
            backgroundColor: p.color,
            width: p.w,
            height: p.h,
            borderRadius: p.round ? "9999px" : "2px",
          }}
          initial={{ y: "-10%", opacity: 0, rotate: 0, scale: 0 }}
          animate={{ y: "110%", opacity: [0, 1, 1, 0], rotate: p.rotation, scale: 1 }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeOut", repeat: Infinity, repeatDelay: 1.2 }}
        />
      ))}
    </div>
  );
}

type OnboardingCelebrationHeroProps = {
  businessName: string;
  primaryColor: string;
  secondaryColor: string;
};

export function OnboardingCelebrationHero({
  businessName,
  primaryColor,
  secondaryColor,
}: OnboardingCelebrationHeroProps) {
  const confettiColors = useMemo(
    () => [primaryColor, secondaryColor, "#FBBF24", "#F472B6", "#ffffff"],
    [primaryColor, secondaryColor],
  );

  return (
    <div
      className="onboarding-celebration-hero"
      style={
        {
          "--onboard-primary": primaryColor,
          "--onboard-secondary": secondaryColor,
        } as React.CSSProperties
      }
    >
      <CelebrationConfetti colors={confettiColors} />
      <div className="onboarding-celebration-hero-glow" aria-hidden />
      <motion.div
        className="onboarding-celebration-hero-icon"
        initial={{ scale: 0.5, opacity: 0, rotate: -12 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.05 }}
      >
        <PartyPopper className="h-8 w-8" strokeWidth={1.75} />
      </motion.div>
      <motion.div
        className="onboarding-celebration-hero-copy"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.12 }}
      >
        <p className="onboarding-celebration-eyebrow">
          <Sparkles className="h-4 w-4" aria-hidden />
          Carte créée pour {businessName}
        </p>
        <h2 className="onboarding-celebration-title">Félicitations !</h2>
        <p className="onboarding-celebration-desc">
          Votre carte fidélité est prête. Partagez les liens avec vos clients et votre équipe.
        </p>
      </motion.div>
    </div>
  );
}

type OnboardingCardShowcaseProps = {
  cardDesignId?: string | null;
  primaryColor: string;
  secondaryColor: string;
  cardBg: string | null;
  clientLink: string;
  stampThreshold: number;
  milestones: StampMilestone[];
  businessName: string;
};

export function OnboardingCardShowcase({
  cardDesignId,
  primaryColor,
  secondaryColor,
  cardBg,
  clientLink,
  stampThreshold,
  milestones,
  businessName,
}: OnboardingCardShowcaseProps) {
  return (
    <div
      className="onboarding-card-showcase"
      style={
        {
          "--onboard-primary": primaryColor,
          "--onboard-secondary": secondaryColor,
        } as React.CSSProperties
      }
    >
      <div className="onboarding-card-showcase-orbit" aria-hidden />
      <motion.div
        className="onboarding-card-showcase-device"
        initial={{ opacity: 0, y: 28, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.2 }}
      >
        <div className="onboarding-card-showcase-notch" aria-hidden />
        <div className="onboarding-card-showcase-screen">
          <CardTemplateBody
            cardDesignId={cardDesignId}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            cardBg={cardBg}
            qrValue={clientLink || "preview"}
            qrSize={156}
            stampThreshold={stampThreshold}
            currentStamps={1}
            milestones={milestones}
            progress={Math.round((1 / stampThreshold) * 100)}
            progressLabel="Tampons"
            footerHint={businessName}
            hint="Premier tampon offert !"
            animated
          />
        </div>
      </motion.div>
      <p className="onboarding-card-showcase-caption">Aperçu client — vos couleurs appliquées</p>
    </div>
  );
}
