import { useState } from "react";
import { affiliateReferralUrl, useAffiliateDashboard } from "@/api/affiliate";
import {
  PlatformPageHeader,
  PlatformCard,
  PlatformCardBody,
  PlatformKpi,
  PlatformKpiSkeleton,
  PlatformSkeleton,
  PlatformButton,
} from "@/components/platform/platform-ui";
import { formatDzd } from "@/lib/pricing";
import { Copy, Link2, Megaphone, Users, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AffiliateDashboardPage() {
  const { data, isLoading, error } = useAffiliateDashboard();
  const { toast } = useToast();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const referralLink = data?.affiliateCode ? affiliateReferralUrl(data.affiliateCode) : "";

  const copy = async (text: string, kind: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      toast({ title: kind === "code" ? "Code copié" : "Lien copié" });
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast({ title: "Copie impossible", variant: "destructive" });
    }
  };

  return (
    <div className="plat-stack">
      <PlatformPageHeader
        title="Tableau de bord"
        description="Partagez votre lien et suivez vos parrainages."
      />

      {error && (
        <p className="text-sm text-red-400">
          Impossible de charger le tableau de bord. Vérifiez que la migration 026 est appliquée.
        </p>
      )}

      <PlatformCard>
        <PlatformCardBody className="space-y-4">
          {isLoading ? (
            <PlatformSkeleton className="h-24 w-full" />
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="plat-label">Votre code</p>
                  <p className="text-2xl font-semibold tracking-wide">{data?.affiliateCode}</p>
                  {data?.socialHandle && (
                    <p className="plat-cell-muted text-sm mt-1">@{data.socialHandle}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <PlatformButton
                    size="sm"
                    variant="secondary"
                    className="gap-2"
                    onClick={() => data?.affiliateCode && copy(data.affiliateCode, "code")}
                  >
                    <Copy className="h-4 w-4" />
                    {copied === "code" ? "Copié" : "Code"}
                  </PlatformButton>
                  <PlatformButton
                    size="sm"
                    className="gap-2"
                    onClick={() => referralLink && copy(referralLink, "link")}
                  >
                    <Link2 className="h-4 w-4" />
                    {copied === "link" ? "Copié" : "Lien"}
                  </PlatformButton>
                </div>
              </div>
              <p className="text-sm text-slate-400 break-all" dir="ltr">
                {referralLink}
              </p>
            </>
          )}
        </PlatformCardBody>
      </PlatformCard>

      {isLoading ? (
        <div className="plat-stat-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <PlatformKpiSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="plat-stat-grid">
          <PlatformKpi title="Inscriptions" value={String(data?.signupCount ?? 0)} icon={Users} accent="secondary" />
          <PlatformKpi title="Conversions" value={String(data?.conversionCount ?? 0)} icon={Megaphone} accent="amber" />
          <PlatformKpi title="En attente" value={formatDzd(data?.pendingCommissionDzd ?? 0)} icon={Wallet} accent="amber" />
          <PlatformKpi title="Payées" value={formatDzd(data?.paidCommissionDzd ?? 0)} icon={Wallet} accent="secondary" />
        </div>
      )}
    </div>
  );
}
