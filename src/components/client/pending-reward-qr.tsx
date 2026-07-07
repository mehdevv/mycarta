import { useEffect, useState } from "react";
import { Link } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import { Gift, Maximize2, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { useClientI18n } from "@/hooks/use-client-i18n";
import { phonesMatch } from "@/lib/phone";
import { Button } from "@/components/ui/button";

type PendingRewardQrProps = {
  rewardId: string;
  description: string;
  primaryColor: string;
  compact?: boolean;
  liteChrome?: boolean;
  requirePhoneVerification?: boolean;
  clientPhone?: string | null;
};

function rewardPhoneVerifiedKey(rewardId: string) {
  return `carta-reward-phone-verified-${rewardId}`;
}

function isRewardPhoneVerified(rewardId: string): boolean {
  try {
    return sessionStorage.getItem(rewardPhoneVerifiedKey(rewardId)) === "1";
  } catch {
    return false;
  }
}

function markRewardPhoneVerified(rewardId: string) {
  try {
    sessionStorage.setItem(rewardPhoneVerifiedKey(rewardId), "1");
  } catch {
    // ignore
  }
}

export default function PendingRewardQr({
  rewardId,
  description,
  primaryColor,
  compact = false,
  liteChrome = false,
  requirePhoneVerification = false,
  clientPhone,
}: PendingRewardQrProps) {
  const { t } = useClientI18n();
  const qrSize = compact ? 96 : 140;
  const needsPhone =
    requirePhoneVerification && Boolean(clientPhone?.trim());
  const [verified, setVerified] = useState(() =>
    !needsPhone || isRewardPhoneVerified(rewardId),
  );
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneError, setPhoneError] = useState(false);

  useEffect(() => {
    if (!needsPhone) {
      setVerified(true);
      return;
    }
    setVerified(isRewardPhoneVerified(rewardId));
  }, [needsPhone, rewardId]);

  const handleVerifyPhone = () => {
    if (!clientPhone) return;
    if (phonesMatch(phoneInput, clientPhone)) {
      markRewardPhoneVerified(rewardId);
      setVerified(true);
      setPhoneError(false);
      return;
    }
    setPhoneError(true);
  };

  const phoneGate = needsPhone && !verified;

  const phoneForm = (
    <div className={compact ? "space-y-2" : "space-y-3 text-left"}>
      <p className={`text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
        {t("rewardPhonePrompt")}
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={t("phonePlaceholder")}
            value={phoneInput}
            onChange={(e) => {
              setPhoneInput(e.target.value);
              setPhoneError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleVerifyPhone();
            }}
            className={`w-full rounded-xl border bg-white pl-9 pr-3 py-2.5 text-sm ${
              phoneError ? "border-red-400" : "border-amber-200"
            }`}
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="shrink-0 h-auto py-2.5 px-3 rounded-xl"
          style={{ backgroundColor: primaryColor }}
          onClick={handleVerifyPhone}
        >
          {t("rewardShowQr")}
        </Button>
      </div>
      {phoneError && (
        <p className="text-xs text-red-600">{t("rewardPhoneMismatch")}</p>
      )}
    </div>
  );

  const qrBlock = (
    <>
      <div className={compact ? "shrink-0" : "flex justify-center mb-3"}>
        <div className="inline-block bg-white p-2 rounded-xl shadow-sm">
          <QRCodeSVG value={`reward:${rewardId}`} size={qrSize} level="H" fgColor="#111" />
        </div>
      </div>
      <div className={compact ? "flex-1 min-w-0 text-left" : undefined}>
        {!compact && (
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-2"
            style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
          >
            <Gift className="h-3.5 w-3.5" />
            {t("rewardReadyToClaim")}
          </div>
        )}
        <p
          className={`font-bold leading-snug ${compact ? "text-sm truncate" : "text-lg"}`}
          style={{ color: primaryColor }}
        >
          {description}
        </p>
        <p className={`text-muted-foreground ${compact ? "text-xs mt-0.5" : "text-sm mt-1"}`}>
          {t("showStaffRewardQr")}
        </p>
        {!compact && (
          <Link
            href={`/reward/${rewardId}`}
            className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-amber-800 hover:underline"
          >
            <Maximize2 className="h-3 w-3" />
            {t("openFullScreenReward")}
          </Link>
        )}
      </div>
    </>
  );

  const content = phoneGate ? (
    <div
      className={
        compact
          ? "p-3 rounded-xl bg-white/90 border border-amber-200"
          : "p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 shadow-sm"
      }
    >
      {!compact && (
        <div className="text-center mb-3">
          <p className="font-bold text-lg" style={{ color: primaryColor }}>
            {description}
          </p>
        </div>
      )}
      {phoneForm}
    </div>
  ) : (
    <div
      className={
        compact
          ? "flex items-center gap-3 p-3 rounded-xl bg-white/90 border border-amber-200"
          : "p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 shadow-sm text-center"
      }
    >
      {qrBlock}
    </div>
  );

  if (liteChrome) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
    >
      {content}
    </motion.div>
  );
}
