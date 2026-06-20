import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { useEnrolClient, useGetSettings, useGetTenantBySlug } from "@/api";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { tapScale } from "@/lib/motion";
import ClientShell, { ClientCard, ClientLoading } from "@/components/client/client-shell";
import BrandLogo from "@/components/brand/mascot";
import { isCardCode, normalizeCardCode } from "@/lib/card-code";
import { ArrowRight, Hash, Loader2, Smartphone, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useClientI18n } from "@/hooks/use-client-i18n";
import { resolveBusinessLogo } from "@/hooks/use-branding";
import { useRoute } from "wouter";

type ClientEnrolProps = {
  tenantSlug?: string;
};

export default function ClientEnrol({ tenantSlug: slugProp }: ClientEnrolProps = {}) {
  const [, params] = useRoute("/:slug/client");
  const tenantSlug = slugProp ?? params?.slug ?? "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, isLoading: langLoading } = useClientI18n();
  const { data: settings, isLoading: settingsLoading } = useGetSettings(tenantSlug || undefined);
  const { data: tenantMeta, isLoading: tenantMetaLoading } = useGetTenantBySlug(tenantSlug || undefined);
  const enrolClient = useEnrolClient();
  const [lookupCode, setLookupCode] = useState("");

  const createSchema = useMemo(
    () =>
      z.object({
        fullName: z.string().min(2, t("nameMinLength")),
        phone: z.string().min(8, t("phoneRequired")),
      }),
    [t],
  );

  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: { fullName: "", phone: "" },
  });

  const primary = settings?.primaryColor ?? "#1A56DB";
  const secondary = settings?.secondaryColor ?? "#0E9F6E";
  const businessLogo = resolveBusinessLogo(
    settings?.logoUrl,
    tenantMeta?.logoUrl as string | undefined,
  );

  const onCreate = async (values: z.infer<typeof createSchema>) => {
    if (!tenantSlug) {
      toast({ title: t("couldNotCreate"), description: "Shop not found", variant: "destructive" });
      return;
    }
    try {
      const response = await enrolClient.mutateAsync({
        data: { fullName: values.fullName, phone: values.phone, slug: tenantSlug },
      });
      if (response.existing) {
        toast({ title: t("welcomeBack"), description: t("openingExisting") });
      }
      const cardSlug = response.tenantSlug ?? tenantSlug;
      setLocation(`~/${cardSlug}/card/${response.cardCode}?new=1`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("loading");
      toast({ title: t("couldNotCreate"), description: message, variant: "destructive" });
    }
  };

  const openExistingCard = () => {
    const code = normalizeCardCode(lookupCode);
    if (!isCardCode(code)) {
      toast({
        title: t("invalidCardNumber"),
        description: t("enterSixDigits"),
        variant: "destructive",
      });
      return;
    }
    setLocation(`~/${tenantSlug}/card/${code}`);
  };

  if (!tenantSlug && !langLoading) {
    return (
      <ClientShell>
        <div className="flex min-h-[100dvh] items-center justify-center p-4 text-center text-muted-foreground">
          Commerce introuvable. Vérifiez le lien QR.
        </div>
      </ClientShell>
    );
  }

  const settingsPending = settingsLoading && !businessLogo;
  const tenantPending = tenantMetaLoading && !businessLogo;

  if (langLoading || settingsPending || tenantPending) {
    return (
      <ClientLoading
        logoUrl={businessLogo}
        businessName={settings?.businessName ?? (tenantMeta?.businessName as string) ?? (tenantMeta?.name as string)}
        primaryColor={settings?.primaryColor}
      />
    );
  }

  return (
    <ClientShell primaryColor={primary} secondaryColor={secondary}>
      <div className="flex min-h-[100dvh] flex-col items-center justify-center p-4 py-8">
        <ClientCard className="overflow-hidden w-full">
          <div className="p-6 pb-4 text-center border-b border-border/50">
            <BrandLogo
              role="client"
              size="md"
              className="mx-auto mb-3"
              float
              logoUrl={businessLogo}
              alt={settings?.businessName}
              primaryColor={primary}
            />
            <h1 className="text-xl font-bold tracking-tight">{settings?.businessName}</h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              {t("getFreeCard")}
            </p>
          </div>

          <div className="px-4 py-6">
            <p className="text-sm text-muted-foreground text-center mb-5">{t("enrolDesc")}</p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreate)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fullName")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("yourName")}
                          autoComplete="name"
                          className="h-12 rounded-xl text-base"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("phone")}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder={t("phonePlaceholder")}
                            className="h-12 pl-10 rounded-xl text-base"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <motion.div {...tapScale()}>
                  <Button
                    type="submit"
                    className="w-full h-14 text-base rounded-2xl font-semibold shadow-md"
                    style={{ backgroundColor: primary }}
                    disabled={enrolClient.isPending}
                  >
                    {enrolClient.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {t("creatingCard")}
                      </>
                    ) : (
                      <>
                        {t("createMyCard")}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>
            </Form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <p className="relative flex justify-center text-xs uppercase tracking-wide text-muted-foreground">
                <span className="bg-white/95 px-3">{t("alreadyHaveCard")}</span>
              </p>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder={t("sixDigitPlaceholder")}
                  value={lookupCode}
                  onChange={(e) => setLookupCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-12 pl-10 rounded-xl text-base font-mono tracking-widest"
                  onKeyDown={(e) => e.key === "Enter" && openExistingCard()}
                  aria-label={t("sixDigitPlaceholder")}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-xl px-5 shrink-0"
                onClick={openExistingCard}
              >
                {t("open")}
              </Button>
            </div>
          </div>
        </ClientCard>
      </div>
    </ClientShell>
  );
}
