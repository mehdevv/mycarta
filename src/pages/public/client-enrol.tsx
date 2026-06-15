import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { useEnrolClient, useGetSettings } from "@/api";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { tapScale } from "@/lib/motion";
import ClientShell, { ClientCard, ClientLoading } from "@/components/client/client-shell";
import Mascot from "@/components/brand/mascot";
import { APP_NAME } from "@/lib/app-name";
import { isCardCode, normalizeCardCode } from "@/lib/card-code";
import { ArrowRight, Hash, Loader2, Smartphone, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useClientI18n } from "@/hooks/use-client-i18n";

export default function ClientEnrol() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, isLoading: langLoading } = useClientI18n();
  const { data: settings, isLoading: settingsLoading } = useGetSettings();
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

  const onCreate = async (values: z.infer<typeof createSchema>) => {
    try {
      const response = await enrolClient.mutateAsync({
        data: { fullName: values.fullName, phone: values.phone },
      });
      if (response.existing) {
        toast({ title: t("welcomeBack"), description: t("openingExisting") });
      }
      setLocation(`~/card/${response.cardCode}?new=1`);
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
    setLocation(`~/card/${code}`);
  };

  if (langLoading || settingsLoading) return <ClientLoading />;

  return (
    <ClientShell primaryColor={primary} secondaryColor={secondary}>
      <div className="flex min-h-[100dvh] flex-col items-center justify-center p-4 py-8">
        <ClientCard className="overflow-hidden w-full">
          <div className="p-6 pb-4 text-center border-b border-border/50">
            <Mascot role="client" size="md" className="mx-auto mb-3" float />
            <h1 className="text-xl font-bold tracking-tight">{settings?.businessName || APP_NAME}</h1>
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
