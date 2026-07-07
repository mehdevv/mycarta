import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cardPageUrl, formatCardCode } from "@/lib/card-code";
import {
  downloadClientCardImage,
  type CardImageExportData,
} from "@/lib/download-client-card-image";
import { tapScale, vibrate } from "@/lib/motion";
import { motion } from "framer-motion";
import { Check, Copy, Download, Loader2 } from "lucide-react";
import { useClientI18n } from "@/hooks/use-client-i18n";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type CardLinkBarProps = {
  code: string;
  primaryColor?: string;
  exportData?: Omit<CardImageExportData, "cardCode" | "primaryColor">;
  liteChrome?: boolean;
  className?: string;
};

export default function CardLinkBar({
  code,
  primaryColor = "#1A56DB",
  exportData,
  liteChrome = false,
  className,
}: CardLinkBarProps) {
  const { t } = useClientI18n();
  const { toast } = useToast();
  const fullUrl = cardPageUrl(code);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      vibrate(30);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      const input = document.createElement("input");
      input.value = fullUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleDownload = async () => {
    if (saving) return;

    setSaving(true);
    try {
      await downloadClientCardImage({
        cardCode: code,
        primaryColor,
        businessName: exportData?.businessName ?? "Carta",
        clientName: exportData?.clientName,
        secondaryColor: exportData?.secondaryColor,
        qrValue: exportData?.qrValue ?? fullUrl,
        cardBgUrl: exportData?.cardBgUrl,
        logoUrl: exportData?.logoUrl,
        stampsEnabled: exportData?.stampsEnabled,
        stampThreshold: exportData?.stampThreshold,
        currentStamps: exportData?.currentStamps,
        milestones: exportData?.milestones,
        progressLabel: exportData?.progressLabel,
        hint: exportData?.hint,
        footerHint: exportData?.footerHint,
      });
      vibrate(30);
      toast({ title: t("cardImageSaved") });
    } catch {
      toast({
        title: t("cardImageFailed"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const copyButton = (
    <Button
      type="button"
      variant="outline"
      className="h-10 w-10 shrink-0 rounded-xl p-0"
      onClick={handleCopy}
      aria-label={copied ? t("copied") : t("copyLink")}
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-600" />
      ) : (
        <Copy className="h-4 w-4" aria-hidden />
      )}
    </Button>
  );

  const downloadButton = (
    <Button
      type="button"
      variant="outline"
      className="h-10 w-10 shrink-0 rounded-xl p-0"
      onClick={() => void handleDownload()}
      disabled={saving}
      aria-label={t("saveCard")}
    >
      {saving ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" aria-hidden />
      )}
    </Button>
  );

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl border border-border/60 bg-white/95 backdrop-blur-md px-2.5 py-2 shadow-sm shrink-0",
        className,
      )}
    >
      <p
        className="font-mono text-base font-bold tracking-wide tabular-nums pl-0.5"
        style={{ color: primaryColor }}
      >
        {formatCardCode(code)}
      </p>

      <div className="flex items-center gap-1.5">
        {liteChrome ? (
          <>
            {copyButton}
            {downloadButton}
          </>
        ) : (
          <>
            <motion.div {...tapScale()}>{copyButton}</motion.div>
            <motion.div {...tapScale()}>{downloadButton}</motion.div>
          </>
        )}
      </div>
    </div>
  );
}
