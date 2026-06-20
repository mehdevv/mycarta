import { useRef } from "react";
import { useRoute, Link } from "wouter";
import { useGetClientCard, useGetTenantBySlug } from "@/api";
import { Button } from "@/components/ui/button";
import { CheckCircle, Gift, ChevronRight, Clock } from "lucide-react";
import { parseStampMilestones } from "@/lib/stamp-milestones";
import { motion } from "framer-motion";
import { fadeUp, scaleIn, vibrate, cardReveal, headerStagger, headerItem } from "@/lib/motion";
import ClientShell, { ClientLoading } from "@/components/client/client-shell";
import BrandLogo from "@/components/brand/mascot";
import CardTemplateBody from "@/components/fidelity/card-template-body";
import CardLinkBar from "@/components/client/card-link-bar";
import { cardPageUrl, normalizeCardCode } from "@/lib/card-code";
import { nextMilestoneHintText } from "@/lib/client-i18n";
import { useClientI18n } from "@/hooks/use-client-i18n";
import { useEffect } from "react";
import { useShopBranding, normalizeAssetUrl, resolveBusinessLogo } from "@/hooks/use-branding";
import { DEFAULT_CARD_DESIGN_ID } from "@/lib/card-templates";
import { PLATFORM } from "@/lib/platform";

export default function CardView() {
  const [, slugParams] = useRoute("/:slug/card/:code");
  const [, legacyParams] = useRoute("/card/:code");
  const tenantSlug = slugParams?.slug ?? "";
  const code = (slugParams?.code ?? legacyParams?.code)
    ? normalizeCardCode(slugParams?.code ?? legacyParams?.code ?? "")
    : "";
  const cardRef = useRef<HTMLDivElement>(null);

  const { data: tenantMeta, isLoading: tenantMetaLoading } = useGetTenantBySlug(tenantSlug || undefined);
  const tenantId = (tenantMeta?.id as string) ?? undefined;

  const { t, lang } = useClientI18n();
  const branding = useShopBranding(tenantSlug || undefined);

  const businessLogo = resolveBusinessLogo(
    branding.logoUrl,
    tenantMeta?.logoUrl as string | undefined,
  );
  const businessName =
    branding.businessName !== PLATFORM.name
      ? branding.businessName
      : String(tenantMeta?.businessName ?? tenantMeta?.name ?? branding.businessName);

  const { data: card, isLoading, error } = useGetClientCard(code, {
    query: { enabled: !!code },
    tenantId,
  });

  useEffect(() => {
    if (card?.pendingRewardId) vibrate([30, 50, 30]);
  }, [card?.pendingRewardId]);

  if (!code) {
    return (
      <ClientShell>
        <div className="flex min-h-[100dvh] items-center justify-center p-4 text-center text-muted-foreground">
          {t("invalidCardLink")}
        </div>
      </ClientShell>
    );
  }

  const brandingPending = branding.isLoading && !businessLogo;
  const tenantPending = !!tenantSlug && tenantMetaLoading && !businessLogo;

  if (isLoading || brandingPending || tenantPending) {
    return (
      <ClientLoading
        logoUrl={businessLogo}
        businessName={businessName}
        primaryColor={branding.primaryColor}
      />
    );
  }

  if (error || !card) {
    return (
      <ClientShell>
        <motion.div
          className="flex min-h-[100dvh] items-center justify-center p-4"
          variants={fadeUp}
          initial="initial"
          animate="animate"
        >
          <div className="text-center p-8 bg-white/90 backdrop-blur rounded-3xl shadow-lg max-w-sm w-full">
            <h2 className="text-xl font-bold mb-2">{t("cardNotFound")}</h2>
            <p className="text-muted-foreground text-sm">{t("cardNotFoundDesc")}</p>
            <Button className="mt-6 w-full rounded-xl" variant="outline" asChild>
              <Link href="/client">{t("getNewCard")}</Link>
            </Button>
          </div>
        </motion.div>
      </ClientShell>
    );
  }

  const milestones = parseStampMilestones(card.stampMilestones);
  const progress = Math.min(100, (card.currentCycleStamps / card.stampThreshold) * 100);
  const hint = nextMilestoneHintText(card.currentCycleStamps, card.stampThreshold, milestones, t);
  const dateLocale = lang === "fr" ? "fr-FR" : "en-US";
  const rewards = Array.isArray(card.rewards) ? card.rewards : [];
  const upcomingMilestones = milestones.filter((m) => m.position > card.currentCycleStamps);
  const showRewardsSection = rewards.length > 0 || upcomingMilestones.length > 0;

  const cardBg = normalizeAssetUrl(card.cardTemplateUrl) || branding.cardTemplateUrl;
  const secondary = branding.secondaryColor;
  const cardDesignId =
    card.cardDesignId ?? branding.cardDesignId ?? DEFAULT_CARD_DESIGN_ID;

  return (
    <ClientShell primaryColor={card.primaryColor} secondaryColor={secondary}>
      <motion.div
        className="flex flex-col min-h-[100dvh] max-w-md mx-auto pb-6"
        variants={fadeUp}
        initial="initial"
        animate="animate"
      >
        <motion.header
          className="px-5 pt-4 pb-3 flex items-center justify-between gap-3"
          variants={headerStagger}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={headerItem} className="flex items-center gap-2.5 min-w-0">
            <BrandLogo
              role="client"
              size="xs"
              animate={false}
              className="shrink-0"
              logoUrl={businessLogo ?? branding.logoUrl}
              alt={card.businessName}
              primaryColor={card.primaryColor}
            />
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight truncate text-foreground drop-shadow-sm">
                {card.clientName}
              </h1>
              <p
                className="text-[11px] font-semibold uppercase tracking-wide truncate"
                style={{ color: card.primaryColor }}
              >
                {card.businessName}
              </p>
            </div>
          </motion.div>
          <motion.div variants={headerItem} className="shrink-0">
            <CardLinkBar code={card.cardCode} primaryColor={card.primaryColor} />
          </motion.div>
        </motion.header>

        <div className="px-5 flex-1">
          <motion.div
            ref={cardRef}
            variants={cardReveal}
            initial="initial"
            animate="animate"
          >
            <CardTemplateBody
              cardDesignId={cardDesignId}
              primaryColor={card.primaryColor}
              secondaryColor={secondary}
              cardBg={cardBg}
              qrValue={cardPageUrl(card.cardCode)}
              stampThreshold={card.stampThreshold}
              currentStamps={card.currentCycleStamps}
              milestones={milestones}
              progress={progress}
              hint={hint}
              progressLabel={t("progress")}
              footerHint={t("showQrHint")}
              animated
            />
          </motion.div>

          {showRewardsSection && (
            <motion.div variants={scaleIn} className="mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1">
                {t("myRewards")}
              </h3>
              <div className="space-y-2">
                {rewards.map((reward, i) => {
                  const isPending = !reward.redeemedAt;
                  const inner = (
                    <>
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                          isPending ? "bg-amber-400" : "bg-emerald-100"
                        }`}
                      >
                        {isPending ? (
                          <Gift className="h-5 w-5 text-white" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-emerald-600" />
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-semibold text-foreground truncate">{reward.rewardDescription}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(reward.createdAt).toLocaleDateString(dateLocale, {
                            month: "short",
                            day: "numeric",
                          })}
                          {" · "}
                          {isPending ? t("rewardPending") : t("rewardRedeemed")}
                        </p>
                        {isPending && (
                          <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {t("tapToRedeem")}
                          </p>
                        )}
                      </div>
                      {isPending && <ChevronRight className="h-5 w-5 text-amber-600 shrink-0" />}
                    </>
                  );

                  return (
                    <motion.div
                      key={reward.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      {isPending ? (
                        <Link
                          href={`/reward/${reward.id}`}
                          className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 shadow-sm active:scale-[0.98] transition-transform"
                        >
                          {inner}
                        </Link>
                      ) : (
                        <Link
                          href={`/reward/${reward.id}`}
                          className="flex items-center gap-3 p-4 rounded-2xl bg-white/80 backdrop-blur border border-white/60 shadow-sm active:scale-[0.98] transition-transform"
                        >
                          {inner}
                        </Link>
                      )}
                    </motion.div>
                  );
                })}
                {upcomingMilestones.map((milestone, i) => (
                  <motion.div
                    key={`upcoming-${milestone.position}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (rewards.length + i) * 0.05 }}
                    className="flex items-center gap-3 p-4 rounded-2xl bg-white/60 backdrop-blur border border-dashed border-gray-300"
                  >
                    <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 bg-gray-100 border border-gray-200">
                      <Gift className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-semibold text-muted-foreground truncate">{milestone.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("rewardUpcoming", { position: milestone.position })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </ClientShell>
  );
}
