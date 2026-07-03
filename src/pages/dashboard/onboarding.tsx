import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import {
  Check,
  Copy,
  Crown,
  Download,
  ExternalLink,
  ImageIcon,
  Loader2,
  Lock,
  Palette,
  Sparkles,
  Upload,
  Users,
  Wand2,
} from "lucide-react";
import { useGetSettings, useUpdateSettings } from "@/api";
import {
  useCompleteOnboarding,
  useCreateChargilyCheckout,
  getTenantQueryKey,
} from "@/api/tenant";
import { useCurrentTenant } from "@/lib/tenant-context";
import { useToast } from "@/hooks/use-toast";
import { PLATFORM } from "@/lib/platform";
import { tenantClientLink, tenantEmployeeLink } from "@/lib/links";
import { uploadTenantAsset } from "@/lib/upload-tenant-asset";
import { extractBrandColorsFromImage, extractSecondaryColor } from "@/lib/extract-brand-colors";
import {
  enforceCardColorPair,
  validateCardPrimaryColor,
  validateCardSecondaryColor,
} from "@/lib/card-color-contrast";
import { getBrandingLimits } from "@/lib/branding-limits";
import { downloadQrCanvas, getQrLogoSettings } from "@/lib/branded-qr";
import type { PlanId } from "@/lib/pricing";
import BrandLogo from "@/components/brand/mascot";
import {
  OnboardingCardShowcase,
  OnboardingCelebrationHero,
} from "@/components/dashboard/onboarding-celebration";
import { cn } from "@/lib/utils";

const STEPS = ["Identité", "Prêt"] as const;
const QR_DISPLAY_SIZE = 160;
const QR_EXPORT_SIZE = 720;
const DEFAULT_PRIMARY = PLATFORM.primaryColor;
const DEFAULT_SECONDARY = PLATFORM.secondaryColor;

function CardPreview({
  logoUrl,
  cardBgUrl,
  primaryColor,
  secondaryColor,
  businessName,
}: {
  logoUrl: string | null;
  cardBgUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  businessName: string;
}) {
  return (
    <div
      className="relative mx-auto w-full max-w-[280px] overflow-hidden rounded-2xl border border-[var(--dash-border)] shadow-lg"
      style={{
        background: cardBgUrl
          ? `url(${cardBgUrl}) center/cover`
          : `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
        minHeight: 160,
      }}
    >
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative flex flex-col items-center justify-center gap-3 p-6 text-white">
        <BrandLogo
          role="client"
          size="sm"
          animate={false}
          logoUrl={logoUrl}
          alt={businessName}
          primaryColor={primaryColor}
        />
        <p className="text-sm font-semibold drop-shadow">{businessName}</p>
        <div className="rounded-lg bg-white/90 p-2">
          <QRCodeSVG value="preview" size={64} level="L" />
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { tenant, slug } = useCurrentTenant();
  const { data: settings } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const completeOnboarding = useCompleteOnboarding();
  const checkout = useCreateChargilyCheckout();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [cardBgUrl, setCardBgUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_SECONDARY);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [downloadingQr, setDownloadingQr] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const qrExportRef = useRef<HTMLDivElement>(null);

  const businessName = settings?.businessName ?? tenant?.name ?? "Ma boutique";
  const clientLink = slug ? tenantClientLink(slug) : "";
  const employeeLink = slug ? tenantEmployeeLink(slug) : "";
  const resolvedLogo = logoUrl ?? settings?.logoUrl ?? null;
  const resolvedBg = cardBgUrl ?? settings?.cardTemplateUrl ?? null;
  const qrLogoUrl = resolvedLogo ?? PLATFORM.logoUrl;
  const qrDisplaySettings = getQrLogoSettings(qrLogoUrl, QR_DISPLAY_SIZE);
  const qrExportSettings = getQrLogoSettings(qrLogoUrl, QR_EXPORT_SIZE);
  const stampThreshold = settings?.stampThreshold ?? 10;
  const milestones = settings?.stampMilestones ?? [];  const planId = (tenant?.planId ?? "trial") as PlanId;
  const limits = getBrandingLimits(planId);
  const canBanner = limits.canCustomCardBackground;

  const saveBrandingStep = async (useDefaults = false) => {
    if (!settings || !tenant) return;

    if (!useDefaults) {
      const primaryError = validateCardPrimaryColor(
        primaryColor,
        secondaryColor,
        settings.cardDesignId,
      );
      const secondaryError = primaryError
        ? null
        : validateCardSecondaryColor(primaryColor, secondaryColor, settings.cardDesignId);
      if (primaryError || secondaryError) {
        toast({
          title: "Couleurs illisibles",
          description: primaryError ?? secondaryError ?? "",
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);
    try {
      const colors = useDefaults
        ? { primary: DEFAULT_PRIMARY, secondary: DEFAULT_SECONDARY }
        : enforceCardColorPair(primaryColor, secondaryColor, settings.cardDesignId);

      await updateSettings.mutateAsync({
        id: settings.id,
        data: useDefaults
          ? {
              logoUrl: null,
              cardTemplateUrl: null,
              primaryColor: DEFAULT_PRIMARY,
              secondaryColor: DEFAULT_SECONDARY,
            }
          : {
              logoUrl: logoUrl ?? settings.logoUrl,
              primaryColor: colors.primary,
              secondaryColor: colors.secondary,
              ...(canBanner ? { cardTemplateUrl: cardBgUrl ?? settings.cardTemplateUrl } : {}),
            },
      });
      if (useDefaults) {
        setLogoUrl(null);
        setCardBgUrl(null);
        setPrimaryColor(DEFAULT_PRIMARY);
        setSecondaryColor(DEFAULT_SECONDARY);
      }
      setStep(1);
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!tenant) return;
    setUploadingLogo(true);
    try {
      const url = await uploadTenantAsset(tenant.id, "logo", file);
      setLogoUrl(url);
      const colors = await extractBrandColorsFromImage(file);
      setPrimaryColor(colors.primary);
      setSecondaryColor(colors.secondary);
    } catch (e) {
      toast({
        title: "Échec upload",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleBgUpload = async (file: File) => {
    if (!tenant || !canBanner) return;
    setUploadingBg(true);
    try {
      const url = await uploadTenantAsset(tenant.id, "card-bg", file);
      setCardBgUrl(url);
      const secondary = await extractSecondaryColor(file);
      setSecondaryColor(secondary);
    } catch (e) {
      toast({
        title: "Échec upload",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setUploadingBg(false);
    }
  };

  const handleUpgradeForBanner = async () => {
    try {
      const result = await checkout.mutateAsync({ planId: "maison", billingPeriod: "monthly" });
      if (result.checkoutUrl) window.location.href = result.checkoutUrl;
    } catch (e) {
      toast({
        title: "Paiement indisponible",
        description: e instanceof Error ? e.message : "Erreur Chargily",
        variant: "destructive",
      });
    }
  };

  const completeAndGo = async (path: string) => {
    setSaving(true);
    try {
      await completeOnboarding.mutateAsync({
        logoUrl: logoUrl ?? settings?.logoUrl ?? null,
        brandColor: primaryColor,
      });
      await queryClient.invalidateQueries({ queryKey: getTenantQueryKey() });
      toast({ title: "Compte activé", description: "Votre carte fidélité est prête !" });
      setLocation(path, { replace: true });
    } catch {
      toast({ title: "Erreur", description: "Impossible d'activer le compte", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async (href: string, key: string) => {
    await navigator.clipboard.writeText(href);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownloadQr = async () => {
    if (!clientLink) return;
    setDownloadingQr(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const canvas = qrExportRef.current?.querySelector("canvas");
      if (!canvas) throw new Error("Canvas unavailable");
      downloadQrCanvas(canvas, `${slug ?? "boutique"}-qr-inscription.png`);
      toast({ title: "QR code téléchargé", description: "Prêt à imprimer ou afficher." });
    } catch {
      toast({
        title: "Échec du téléchargement",
        description: "Réessayez dans un instant.",
        variant: "destructive",
      });
    } finally {
      setDownloadingQr(false);
    }
  };

  return (
    <div className="dash-shell min-h-screen bg-[var(--dash-bg-secondary)]">
      <div
        className={cn(
          "mx-auto flex min-h-screen flex-col px-4 py-8 sm:px-6",
          step === 1 ? "max-w-5xl" : "max-w-2xl",
        )}
      >
        <header className="mb-8 text-center">
          <p className="dash-page-eyebrow">Configuration</p>
          <h1 className="dash-page-title mt-2">Personnalisez {businessName}</h1>
          <p className="dash-page-desc mx-auto mt-2">
            Étape {step + 1} sur {STEPS.length} — {STEPS[step]}
          </p>
          <div className="mt-6 flex gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  i <= step ? "" : "bg-[var(--dash-border)]",
                )}
                style={
                  i <= step
                    ? {
                        background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
                      }
                    : undefined
                }
              />
            ))}
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className={cn("dash-card flex-1", step === 1 && "dash-card--onboarding-ready")}
          >
            <div className={cn("dash-card-body", step === 1 && "dash-card-body--onboarding-ready space-y-0")}>
              {step === 0 && (
                <>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--dash-brand-soft)] text-[var(--dash-brand)]">
                      <Palette className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="dash-card-title">Logo, couleurs et bannière</h2>
                      <p className="dash-section-desc">
                        Configurez l&apos;identité visuelle de votre carte fidélité en une seule étape.
                      </p>
                    </div>
                  </div>

                  <CardPreview
                    logoUrl={logoUrl ?? settings?.logoUrl ?? null}
                    cardBgUrl={cardBgUrl ?? settings?.cardTemplateUrl ?? null}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    businessName={businessName}
                  />

                  <div className="space-y-4 rounded-xl border border-[var(--dash-border)] p-4">
                    <p className="text-sm font-medium text-[var(--dash-text)]">Logo</p>
                    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-[var(--dash-border)] bg-[var(--dash-bg-secondary)] transition-colors hover:border-[var(--dash-brand)]"
                      >
                        {uploadingLogo ? (
                          <Loader2 className="h-8 w-8 animate-spin text-[var(--dash-brand)]" />
                        ) : logoUrl || settings?.logoUrl ? (
                          <img
                            src={logoUrl ?? settings?.logoUrl ?? ""}
                            alt=""
                            className="h-full w-full rounded-2xl object-contain p-2"
                          />
                        ) : (
                          <Upload className="h-8 w-8 text-[var(--dash-text-secondary)]" />
                        )}
                      </button>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleLogoUpload(f);
                        }}
                      />
                      <div className="flex-1 space-y-3 w-full">
                        <div>
                          <label className="text-sm font-medium text-[var(--dash-text)]">Couleur principale</label>
                          <input
                            type="color"
                            value={primaryColor}
                            onChange={(e) => {
                              const error = validateCardPrimaryColor(
                                e.target.value,
                                secondaryColor,
                                settings?.cardDesignId,
                              );
                              if (error) {
                                toast({ title: "Couleur illisible", description: error, variant: "destructive" });
                                return;
                              }
                              setPrimaryColor(e.target.value);
                            }}
                            className="mt-1 h-11 w-full cursor-pointer rounded-xl border border-[var(--dash-border)]"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-[var(--dash-text)]">Couleur secondaire</label>
                          <input
                            type="color"
                            value={secondaryColor}
                            onChange={(e) => {
                              const error = validateCardSecondaryColor(
                                primaryColor,
                                e.target.value,
                                settings?.cardDesignId,
                              );
                              if (error) {
                                toast({ title: "Couleur illisible", description: error, variant: "destructive" });
                                return;
                              }
                              setSecondaryColor(e.target.value);
                            }}
                            className="mt-1 h-11 w-full cursor-pointer rounded-xl border border-[var(--dash-border)]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "space-y-3 rounded-xl border p-4",
                      canBanner
                        ? "border-[var(--dash-border)]"
                        : "border-amber-200 bg-amber-50/60",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {canBanner ? (
                        <ImageIcon className="h-5 w-5 shrink-0 text-[var(--dash-brand)] mt-0.5" />
                      ) : (
                        <Lock className="h-5 w-5 shrink-0 text-amber-700 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--dash-text)]">Bannière de carte</p>
                        <p className="mt-1 text-sm text-[var(--dash-text-secondary)]">
                          Image affichée derrière la carte QR de vos clients. Optionnel.
                        </p>
                      </div>
                    </div>

                    {canBanner ? (
                      <>
                        <button
                          type="button"
                          onClick={() => bgInputRef.current?.click()}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--dash-border)] py-6 text-sm text-[var(--dash-text-secondary)] transition-colors hover:border-[var(--dash-brand)] hover:text-[var(--dash-brand)]"
                        >
                          {uploadingBg ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Upload className="h-5 w-5" />
                          )}
                          {cardBgUrl || settings?.cardTemplateUrl
                            ? "Changer la bannière"
                            : "Téléverser une bannière"}
                        </button>
                        <input
                          ref={bgInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void handleBgUpload(f);
                          }}
                        />
                      </>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-amber-900">
                          Non incluse dans le plan {limits.planLabel}. Passez au plan Maison pour téléverser votre
                          propre bannière, ou commandez un design personnalisé (3 500 DA).
                        </p>
                        <button
                          type="button"
                          className="dash-btn-primary w-full sm:w-auto"
                          onClick={() => void handleUpgradeForBanner()}
                          disabled={checkout.isPending}
                        >
                          {checkout.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Crown className="h-4 w-4" />
                          )}
                          Passer au plan Maison
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      className="dash-btn-primary flex-1"
                      onClick={() => saveBrandingStep(false)}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Continuer
                    </button>
                    <button
                      type="button"
                      className="dash-btn-secondary flex-1"
                      onClick={() => saveBrandingStep(true)}
                      disabled={saving}
                    >
                      Utiliser les valeurs par défaut
                    </button>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <OnboardingCelebrationHero
                    businessName={businessName}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                  />

                  <div className="onboarding-ready-grid">
                    <OnboardingCardShowcase
                      cardDesignId={settings?.cardDesignId}
                      primaryColor={primaryColor}
                      secondaryColor={secondaryColor}
                      cardBg={resolvedBg}
                      clientLink={clientLink}
                      stampThreshold={stampThreshold}
                      milestones={milestones}
                      businessName={businessName}
                    />

                    <div className="onboarding-ready-links space-y-5">
                      {clientLink && (
                        <div
                          className="space-y-4 rounded-xl border p-4"
                          style={{ borderColor: `${primaryColor}22` }}
                        >
                          <p className="text-sm font-medium flex items-center gap-2">
                            <Sparkles className="h-4 w-4" style={{ color: primaryColor }} />
                            Lien clients
                          </p>
                          <div className="flex flex-col items-center gap-3">
                            <div
                              className="rounded-2xl border bg-white p-3 shadow-sm"
                              style={{ borderColor: `${primaryColor}28`, boxShadow: `0 8px 24px ${primaryColor}14` }}
                            >
                              <QRCodeSVG
                                value={clientLink}
                                size={QR_DISPLAY_SIZE}
                                level="H"
                                marginSize={1}
                                imageSettings={qrDisplaySettings}
                              />
                            </div>
                            <button
                              type="button"
                              className="dash-btn-secondary w-full sm:w-auto"
                              onClick={() => void handleDownloadQr()}
                              disabled={downloadingQr}
                            >
                              {downloadingQr ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                              Télécharger le QR code
                            </button>
                          </div>
                          <p className="font-mono text-xs break-all text-[var(--dash-text-secondary)]">{clientLink}</p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="dash-btn-secondary flex-1 !w-auto"
                              onClick={() => void copyLink(clientLink, "client")}
                            >
                              {copied === "client" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              Copier
                            </button>
                            <a
                              href={clientLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="dash-btn-secondary flex-1 !w-auto no-underline"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Ouvrir
                            </a>
                          </div>
                        </div>
                      )}

                      {employeeLink && (
                        <div className="space-y-3 rounded-xl border border-[var(--dash-border)] p-4">
                          <p className="text-sm font-medium flex items-center gap-2">
                            <Users className="h-4 w-4" style={{ color: primaryColor }} />
                            Connexion employés
                          </p>
                          <p className="font-mono text-xs break-all text-[var(--dash-text-secondary)]">{employeeLink}</p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="dash-btn-secondary flex-1 !w-auto"
                              onClick={() => void copyLink(employeeLink, "employee")}
                            >
                              {copied === "employee" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              Copier
                            </button>
                            <a
                              href={employeeLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="dash-btn-secondary flex-1 !w-auto no-underline"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Ouvrir
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="onboarding-ready-actions space-y-2 pt-6 border-t border-[var(--dash-border)]">
                    <button
                      type="button"
                      className="dash-btn-primary w-full onboarding-brand-btn"
                      style={{
                        background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                        borderColor: "transparent",
                      }}
                      onClick={() => void completeAndGo("/dashboard/ccard")}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                      Personnaliser ma carte
                    </button>
                    <button
                      type="button"
                      className="dash-btn-secondary w-full"
                      onClick={() => void completeAndGo("/dashboard")}
                      disabled={saving}
                    >
                      Accéder au tableau de bord
                    </button>
                  </div>

                  {clientLink && (
                    <div ref={qrExportRef} className="dash-qr-export-hidden" aria-hidden>
                      <QRCodeCanvas
                        value={clientLink}
                        size={QR_EXPORT_SIZE}
                        level="H"
                        marginSize={2}
                        imageSettings={qrExportSettings}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
