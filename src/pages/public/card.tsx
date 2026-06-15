import { useRef } from "react";
import { useRoute, Link } from "wouter";
import { useGetClientCard } from "@/api";
import { Button } from "@/components/ui/button";
import { Download, Share2, Gift, ChevronRight } from "lucide-react";
import { parseStampMilestones } from "@/lib/stamp-milestones";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { fadeUp, scaleIn, tapScale, vibrate, cardReveal, headerStagger, headerItem } from "@/lib/motion";
import ClientShell, { ClientLoading } from "@/components/client/client-shell";
import Mascot from "@/components/brand/mascot";
import ClientStampGrid from "@/components/client/stamp-grid";
import CardLinkBar from "@/components/client/card-link-bar";
import { cardPageUrl, normalizeCardCode } from "@/lib/card-code";
import { nextMilestoneHintText } from "@/lib/client-i18n";
import { useClientI18n } from "@/hooks/use-client-i18n";
import { useEffect, useMemo } from "react";

const FIDELITY_CARD_BG = "/fidelity-card-bg.png";
const SCAN_HISTORY_WINDOW_MS = 60 * 60 * 1000;

export default function CardView() {
  const [, params] = useRoute("/card/:code");
  const code = params?.code ? normalizeCardCode(params.code) : "";
  const cardRef = useRef<HTMLDivElement>(null);

  const { t, lang } = useClientI18n();

  const { data: card, isLoading, error } = useGetClientCard(code, {
    query: { enabled: !!code },
  });

  const isNewCard = useMemo(
    () => new URLSearchParams(window.location.search).get("new") === "1",
    [],
  );

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

  if (isLoading) return <ClientLoading />;

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
  const recentScans = (card.recentScans ?? []).filter(
    (scan) => Date.now() - new Date(scan.scannedAt).getTime() < SCAN_HISTORY_WINDOW_MS,
  );

  const handleDownload = async () => {
    if (!cardRef.current) return;
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true });
    const link = document.createElement("a");
    link.download = `${card.clientName.replace(/\s+/g, "-")}-loyalty-card.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    vibrate(40);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: t("loyaltyCardTitle", { business: card.businessName }),
        url: window.location.href,
      });
    }
  };

  return (
    <ClientShell primaryColor={card.primaryColor} secondaryColor="#0E9F6E">
      <motion.div
        className="flex flex-col min-h-[100dvh] max-w-md mx-auto pb-6"
        variants={fadeUp}
        initial="initial"
        animate="animate"
      >
        <motion.header
          className="px-4 pt-4 pb-3 flex items-center justify-between gap-3"
          variants={headerStagger}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={headerItem} className="flex items-center gap-2.5 min-w-0">
            <Mascot role="client" size="xs" animate={false} className="shrink-0" />
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
          <motion.div variants={headerItem} className="flex items-center gap-1.5 shrink-0">
            <motion.div {...tapScale()}>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2.5 rounded-lg text-xs bg-white/90 shadow-sm border-gray-200"
                onClick={handleShare}
                aria-label={t("shareCard")}
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="ml-1">{t("share")}</span>
              </Button>
            </motion.div>
            <motion.div {...tapScale()}>
              <Button
                type="button"
                size="sm"
                className="h-8 px-2.5 rounded-lg text-xs shadow-sm"
                onClick={handleDownload}
                style={{ backgroundColor: card.primaryColor }}
                aria-label={t("saveCard")}
              >
                <Download className="h-3.5 w-3.5" />
                <span className="ml-1">{t("save")}</span>
              </Button>
            </motion.div>
          </motion.div>
        </motion.header>

        {card.pendingRewardId && (
          <motion.div variants={scaleIn} className="px-4 mb-4">
            <Link
              href={`/rewards/${card.cardCode}`}
              className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 shadow-sm active:scale-[0.98] transition-transform"
            >
              <div className="h-12 w-12 rounded-full bg-amber-400 flex items-center justify-center shrink-0 shadow-md">
                <Gift className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-bold text-amber-900">{t("rewardReady")}</p>
                <p className="text-sm text-amber-800 truncate">{card.pendingRewardDescription}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-amber-600 shrink-0" />
            </Link>
          </motion.div>
        )}

        <div className="px-4 flex-1">
          <motion.div
            ref={cardRef}
            className="relative w-full rounded-3xl overflow-hidden border border-white/70 shadow-[0_8px_32px_rgba(15,23,42,0.12)]"
            variants={cardReveal}
            initial="initial"
            animate="animate"
          >
            <div
              className="absolute inset-0 bg-cover bg-center pointer-events-none"
              style={{
                backgroundImage: `url(${FIDELITY_CARD_BG})`,
                opacity: 0.75,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/55 via-white/35 to-white/65 pointer-events-none" />

            <div className="relative p-5 flex justify-center">
              <motion.div
                className="bg-white p-3.5 rounded-2xl shadow-lg border border-gray-200/90"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 340, damping: 28, delay: 0.12 }}
              >
                <QRCodeSVG value={cardPageUrl(card.cardCode)} size={188} level="H" fgColor="#111" />
              </motion.div>
            </div>

            <div className="relative mx-4 mb-4 rounded-2xl bg-white/95 backdrop-blur-md border border-white/80 shadow-sm px-4 py-4">
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-semibold text-gray-700">{t("progress")}</span>
                <span className="text-lg font-bold tabular-nums" style={{ color: card.primaryColor }}>
                  {card.currentCycleStamps}/{card.stampThreshold}
                </span>
              </div>

              <div className="h-2.5 rounded-full bg-gray-200/80 overflow-hidden mb-4 shadow-inner">
                <motion.div
                  className="h-full rounded-full shadow-sm"
                  style={{ backgroundColor: card.primaryColor }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>

              {hint && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.35 }}
                  className="text-xs text-center font-semibold mb-3 px-3 py-2 rounded-xl bg-amber-50 text-amber-950 border border-amber-200/80 shadow-sm"
                >
                  {hint}
                </motion.p>
              )}

              <ClientStampGrid
                stampThreshold={card.stampThreshold}
                currentStamps={card.currentCycleStamps}
                milestones={milestones}
                primaryColor={card.primaryColor}
              />

              <p className="text-center text-xs font-medium text-gray-600 mt-5">{t("showQrHint")}</p>
            </div>
          </motion.div>

          <div className="mt-4">
            <CardLinkBar
              code={card.cardCode}
              primaryColor={card.primaryColor}
              prominent={isNewCard}
            />
          </div>

          {recentScans.length > 0 && (
            <motion.div className="mt-6" variants={fadeUp}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1">
                {t("recentVisits")}
              </h3>
              <div className="space-y-2">
                {recentScans.map((scan, i) => (
                  <motion.div
                    key={`${scan.scannedAt}-${i}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex justify-between text-sm bg-white/80 backdrop-blur rounded-xl px-4 py-3 shadow-sm border border-white/60"
                  >
                    <span className="text-muted-foreground">
                      {new Date(scan.scannedAt).toLocaleTimeString(dateLocale, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    <span
                      className={
                        scan.status === "approved" ? "font-semibold text-emerald-600" : "text-destructive"
                      }
                    >
                      {scan.status === "approved" ? `+${scan.stampsAdded}` : t("blocked")}
                    </span>
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
