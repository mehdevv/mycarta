import { useEffect, useRef, useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useGetRewardClaim, useGetRewardClaimById } from "@/api";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { celebrate, confettiBurst, fadeUp, rewardGranted, scaleIn, tapScale, vibrate } from "@/lib/motion";
import ClientShell, { ClientCard, ClientLoading } from "@/components/client/client-shell";
import BrandLogo from "@/components/brand/mascot";
import { ArrowLeft, CheckCircle, Gift, QrCode, Sparkles } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { normalizeCardCode } from "@/lib/card-code";
import { useClientI18n } from "@/hooks/use-client-i18n";
import { resolveClientCardPath } from "@/lib/scoped-routes";

function RewardCelebration({ label, description }: { label: string; description: string }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-amber-400 to-orange-500 p-8 text-center text-white shadow-2xl overflow-hidden"
        variants={rewardGranted}
        initial="initial"
        animate="animate"
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-white"
            custom={i}
            variants={confettiBurst}
            initial="initial"
            animate="animate"
          />
        ))}
        <motion.div
          animate={{ rotate: [0, -6, 6, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 0.6, repeat: 2 }}
        >
          <Gift className="h-20 w-20 mx-auto mb-4 drop-shadow-lg" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">{label}</h2>
        <p className="text-white/90 text-sm">{description}</p>
        <Sparkles className="h-6 w-6 mx-auto mt-4 opacity-80" />
      </motion.div>
    </motion.div>
  );
}

export default function RewardClaim() {
  const [, paramsById] = useRoute("/reward/:id");
  const [, paramsByCode] = useRoute("/rewards/:code");
  const rewardId = paramsById?.id ?? "";
  const code = paramsByCode?.code ? normalizeCardCode(paramsByCode.code) : "";
  const { t, lang } = useClientI18n();
  const [, navigate] = useLocation();
  const dateLocale = lang === "fr" ? "fr-FR" : "en-US";

  const byId = useGetRewardClaimById(rewardId, {
    query: { enabled: !!rewardId, pollWhilePending: true },
  });
  const byCode = useGetRewardClaim(code, {
    query: { enabled: !rewardId && !!code },
  });

  const reward = rewardId ? byId.data : byCode.data;
  const isLoading = rewardId ? byId.isLoading : byCode.isLoading;
  const error = rewardId ? byId.error : byCode.error;

  const [showCelebration, setShowCelebration] = useState(false);
  const sawPendingRef = useRef(false);

  useEffect(() => {
    if (!reward) return;
    if (!reward.redeemedAt) {
      sawPendingRef.current = true;
      return;
    }
    if (!sawPendingRef.current) return;
    sawPendingRef.current = false;
    setShowCelebration(true);
    vibrate([40, 30, 40, 30, 80]);
    const timer = window.setTimeout(() => setShowCelebration(false), 4500);
    return () => window.clearTimeout(timer);
  }, [reward?.redeemedAt, reward]);

  if (!rewardId && !code) {
    return (
      <ClientShell>
        <div className="flex min-h-[100dvh] items-center justify-center p-4 text-muted-foreground">
          {t("invalidRewardLink")}
        </div>
      </ClientShell>
    );
  }

  if (isLoading) return <ClientLoading label={t("loadingReward")} />;

  if (error || !reward) {
    return (
      <ClientShell>
        <div className="flex min-h-[100dvh] items-center justify-center p-4">
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="w-full max-w-md">
            <ClientCard className="p-8 text-center">
              <h2 className="text-xl font-bold mb-2">{t("noRewardWaiting")}</h2>
              <p className="text-muted-foreground text-sm mb-6">{t("noRewardDesc")}</p>
              <Button
                className="w-full h-12 rounded-xl"
                variant="outline"
                onClick={() => navigate(resolveClientCardPath(code))}
              >
                {t("backToMyCard")}
              </Button>
            </ClientCard>
          </motion.div>
        </div>
      </ClientShell>
    );
  }

  const earnedDate = new Date(reward.createdAt).toLocaleDateString(dateLocale, { dateStyle: "medium" });
  const isRedeemed = Boolean(reward.redeemedAt);
  const backHref = resolveClientCardPath(reward.cardCode);

  return (
    <ClientShell primaryColor={reward.primaryColor}>
      <AnimatePresence>
        {showCelebration && (
          <RewardCelebration label={t("rewardEnjoy")} description={reward.rewardDescription} />
        )}
      </AnimatePresence>

      <motion.div
        className="flex flex-col min-h-[100dvh] max-w-md mx-auto px-4 py-6"
        variants={fadeUp}
        initial="initial"
        animate="animate"
      >
        <Link
          href={backHref}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 min-h-12 w-fit -ml-1 px-1"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("myCard")}
        </Link>

        <motion.div variants={celebrate} initial="initial" animate="animate" className="text-center mb-6">
          <BrandLogo role="client" size="md" className="mx-auto mb-4" float primaryColor={reward.primaryColor} alt={reward.businessName} />
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {reward.businessName}
          </p>
          <h1 className="text-2xl font-bold mt-1">{t("yourPrize")}</h1>
        </motion.div>

        <motion.div variants={scaleIn} initial="initial" animate="animate">
          <ClientCard className="overflow-hidden">
            <div className="h-1.5 w-full" style={{ backgroundColor: reward.primaryColor }} />
            <CardContent className="p-6 text-center pt-8">
              <p className="text-lg text-muted-foreground">{reward.clientName}</p>
              <p
                className="text-2xl font-bold mt-3 leading-snug"
                style={{ color: reward.primaryColor }}
              >
                {reward.rewardDescription}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {t("earnedOn", { date: earnedDate })}
              </p>

              {isRedeemed ? (
                <motion.div
                  className="mt-8 p-5 rounded-2xl bg-emerald-50 border border-emerald-200"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <CheckCircle className="h-10 w-10 mx-auto text-emerald-600 mb-3" />
                  <p className="font-semibold text-emerald-900">{t("rewardAlreadyRedeemed")}</p>
                  <p className="text-sm text-emerald-800 mt-2">{t("rewardRedeemedDesc")}</p>
                </motion.div>
              ) : (
                <div className="mt-8 p-5 rounded-2xl bg-muted/40 border border-border/50">
                  <QrCode className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium mb-1">{t("showStaffCode")}</p>
                  <p className="text-xs text-muted-foreground mb-4">{t("waitingForStaff")}</p>
                  <motion.div
                    className="inline-block bg-white p-4 rounded-2xl shadow-sm"
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <QRCodeSVG value={`reward:${reward.id}`} size={176} level="H" />
                  </motion.div>
                </div>
              )}

              {!isRedeemed && (
                <p className="text-xs text-muted-foreground mt-6">{t("staffRedeemHint")}</p>
              )}
            </CardContent>
          </ClientCard>
        </motion.div>

        <motion.div className="mt-6" {...tapScale()}>
          <Button
            className="w-full h-14 rounded-2xl text-base"
            variant="outline"
            onClick={() => navigate(backHref)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("backToLoyaltyCard")}
          </Button>
        </motion.div>
      </motion.div>
    </ClientShell>
  );
}
