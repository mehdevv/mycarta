import BrandLogo from "@/components/brand/mascot";
import ClientShell, { ClientCard } from "@/components/client/client-shell";
import { useClientI18n } from "@/hooks/use-client-i18n";
import { Store } from "lucide-react";

type ClientPortalClosedProps = {
  businessName: string;
  logoUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
};

export default function ClientPortalClosed({
  businessName,
  logoUrl,
  primaryColor = "#1A56DB",
  secondaryColor = "#0E9F6E",
}: ClientPortalClosedProps) {
  const { t } = useClientI18n();
  const shop = businessName.trim() || "ce commerce";

  return (
    <ClientShell primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <div className="flex min-h-[100dvh] flex-col items-center justify-center p-4 py-8">
        <ClientCard className="overflow-hidden w-full max-w-md text-center">
          <div className="p-6 pb-4 border-b border-border/50">
            <BrandLogo
              role="client"
              size="md"
              className="mx-auto mb-3"
              logoUrl={logoUrl}
              alt={shop}
              primaryColor={primaryColor}
            />
            <h1 className="text-xl font-bold tracking-tight">{shop}</h1>
          </div>
          <div className="px-6 py-8 space-y-4">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted"
              aria-hidden
            >
              <Store className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-base font-semibold text-foreground">
              {t("contactOwnerTitle", { shop })}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("contactOwnerDesc", { shop })}
            </p>
          </div>
        </ClientCard>
      </div>
    </ClientShell>
  );
}
