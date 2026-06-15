import { useRoute, Link, useLocation } from "wouter";
import { useGetRewardClaim } from "@/api";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { celebrate, fadeUp, scaleIn, tapScale } from "@/lib/motion";
import ClientShell, { ClientCard, ClientLoading } from "@/components/client/client-shell";
import Mascot from "@/components/brand/mascot";
import { ArrowLeft, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { normalizeCardCode } from "@/lib/card-code";

export default function RewardClaim() {
  const [, params] = useRoute("/rewards/:code");
  const code = params?.code ? normalizeCardCode(params.code) : "";

  const { data: reward, isLoading, error } = useGetRewardClaim(code, {
    query: { enabled: !!code },
  });
  const [, navigate] = useLocation();

  if (!code) {
    return (
      <ClientShell>
        <div className="flex min-h-[100dvh] items-center justify-center p-4 text-muted-foreground">
          Invalid reward link
        </div>
      </ClientShell>
    );
  }

  if (isLoading) return <ClientLoading label="Loading reward…" />;

  if (error || !reward) {
    return (
      <ClientShell primaryColor={reward?.primaryColor}>
        <div className="flex min-h-[100dvh] items-center justify-center p-4">
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="w-full max-w-md">
            <ClientCard className="p-8 text-center">
              <h2 className="text-xl font-bold mb-2">No reward waiting</h2>
              <p className="text-muted-foreground text-sm mb-6">
                You don&apos;t have a prize to claim right now. Keep collecting stamps!
              </p>
              <Button className="w-full h-12 rounded-xl" variant="outline" onClick={() => navigate(`/card/${code}`)}>
                Back to my card
              </Button>
            </ClientCard>
          </motion.div>
        </div>
      </ClientShell>
    );
  }

  return (
    <ClientShell primaryColor={reward.primaryColor}>
      <motion.div
        className="flex flex-col min-h-[100dvh] max-w-md mx-auto px-4 py-6"
        variants={fadeUp}
        initial="initial"
        animate="animate"
      >
        <Link
          href={`/card/${reward.cardCode}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 min-h-12 w-fit -ml-1 px-1"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          My card
        </Link>

        <motion.div variants={celebrate} initial="initial" animate="animate" className="text-center mb-6">
          <Mascot role="client" size="md" className="mx-auto mb-4" float />
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {reward.businessName}
          </p>
          <h1 className="text-2xl font-bold mt-1">Your prize</h1>
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
                Earned {new Date(reward.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
              </p>

              <div className="mt-8 p-5 rounded-2xl bg-muted/40 border border-border/50">
                <QrCode className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium mb-4">Show staff this code</p>
                <motion.div
                  className="inline-block bg-white p-4 rounded-2xl shadow-sm"
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <QRCodeSVG value={`reward:${reward.id}`} size={176} level="H" />
                </motion.div>
              </div>

              <p className="text-xs text-muted-foreground mt-6">
                Staff will mark this as redeemed when you collect your prize.
              </p>
            </CardContent>
          </ClientCard>
        </motion.div>

        <motion.div className="mt-6" {...tapScale()}>
          <Button
            className="w-full h-14 rounded-2xl text-base"
            variant="outline"
            onClick={() => navigate(`/card/${reward.cardCode}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to loyalty card
          </Button>
        </motion.div>
      </motion.div>
    </ClientShell>
  );
}
