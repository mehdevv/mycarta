import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  Check,
  Copy,
  ExternalLink,
  ImageIcon,
  Loader2,
  Palette,
  Shield,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";
import { useGetSettings, useUpdateSettings } from "@/api";
import {
  useCompleteOnboarding,
  getTenantQueryKey,
} from "@/api/tenant";
import { useCurrentTenant } from "@/lib/tenant-context";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { PLATFORM } from "@/lib/platform";
import { tenantClientLink, tenantEmployeeLink } from "@/lib/links";
import { uploadTenantAsset } from "@/lib/upload-tenant-asset";
import { extractBrandColorsFromImage, extractSecondaryColor } from "@/lib/extract-brand-colors";
import { supabase } from "@/lib/supabase";
import BrandLogo from "@/components/brand/mascot";
import { cn } from "@/lib/utils";

const STEPS = ["Identité", "Carte fidélité", "Sécurité", "Prêt"] as const;

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
  const { user } = useAuth();
  const { data: settings } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const completeOnboarding = useCompleteOnboarding();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [cardBgUrl, setCardBgUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_SECONDARY);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const businessName = settings?.businessName ?? tenant?.name ?? "Ma boutique";
  const clientLink = slug ? tenantClientLink(slug) : "";
  const employeeLink = slug ? tenantEmployeeLink(slug) : "";

  const saveBranding = async (useDefaults = false) => {
    if (!settings || !tenant) return;
    setSaving(true);
    try {
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
              primaryColor,
              secondaryColor,
            },
      });
      if (useDefaults) {
        setLogoUrl(null);
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

  const saveCardBg = async (useDefaults = false) => {
    if (!settings) return;
    setSaving(true);
    try {
      await updateSettings.mutateAsync({
        id: settings.id,
        data: useDefaults
          ? { cardTemplateUrl: null }
          : { cardTemplateUrl: cardBgUrl ?? settings.cardTemplateUrl },
      });
      if (useDefaults) setCardBgUrl(null);
      setStep(2);
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
    if (!tenant) return;
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

  const saveSecurity = async () => {
    if (newPassword) {
      if (newPassword.length < 8) {
        toast({ title: "Mot de passe trop court", description: "8 caractères minimum", variant: "destructive" });
        return;
      }
      if (newPassword !== confirmPassword) {
        toast({ title: "Les mots de passe ne correspondent pas", variant: "destructive" });
        return;
      }
      setSaving(true);
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        toast({ title: "Mot de passe mis à jour" });
      } catch (e) {
        toast({
          title: "Erreur",
          description: e instanceof Error ? e.message : "Impossible de changer le mot de passe",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }
      setSaving(false);
    }
    setStep(3);
  };

  const finish = async () => {
    setSaving(true);
    try {
      await completeOnboarding.mutateAsync({
        logoUrl: logoUrl ?? settings?.logoUrl ?? null,
        brandColor: primaryColor,
      });
      await queryClient.invalidateQueries({ queryKey: getTenantQueryKey() });
      toast({ title: "Compte activé", description: "Votre boutique est prête !" });
      setLocation("/dashboard", { replace: true });
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

  return (
    <div className="dash-shell min-h-screen bg-[var(--dash-bg-secondary)]">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8 sm:px-6">
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
                  i <= step ? "bg-[var(--dash-brand)]" : "bg-[var(--dash-border)]",
                )}
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
            className="dash-card flex-1"
          >
            <div className="dash-card-body space-y-6">
              {step === 0 && (
                <>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--dash-brand-soft)] text-[var(--dash-brand)]">
                      <Palette className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="dash-card-title">Logo et couleurs</h2>
                      <p className="dash-section-desc">
                        Téléversez votre logo — nous extrayons automatiquement vos couleurs de marque.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-[var(--dash-border)] bg-[var(--dash-bg-secondary)] transition-colors hover:border-[var(--dash-brand)]"
                    >
                      {uploadingLogo ? (
                        <Loader2 className="h-8 w-8 animate-spin text-[var(--dash-brand)]" />
                      ) : logoUrl ? (
                        <img src={logoUrl} alt="" className="h-full w-full rounded-2xl object-contain p-2" />
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
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="mt-1 h-11 w-full cursor-pointer rounded-xl border border-[var(--dash-border)]"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-[var(--dash-text)]">Couleur secondaire</label>
                        <input
                          type="color"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="mt-1 h-11 w-full cursor-pointer rounded-xl border border-[var(--dash-border)]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      className="dash-btn-primary flex-1"
                      onClick={() => saveBranding(false)}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Continuer
                    </button>
                    <button
                      type="button"
                      className="dash-btn-secondary flex-1"
                      onClick={() => saveBranding(true)}
                      disabled={saving}
                    >
                      Utiliser les valeurs par défaut
                    </button>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--dash-brand-soft)] text-[var(--dash-brand)]">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="dash-card-title">Fond de carte fidélité</h2>
                      <p className="dash-section-desc">
                        Image affichée derrière la carte QR de vos clients. Optionnel.
                      </p>
                    </div>
                  </div>

                  <CardPreview
                    logoUrl={logoUrl ?? settings?.logoUrl ?? null}
                    cardBgUrl={cardBgUrl}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    businessName={businessName}
                  />

                  <button
                    type="button"
                    onClick={() => bgInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--dash-border)] py-8 text-sm text-[var(--dash-text-secondary)] transition-colors hover:border-[var(--dash-brand)] hover:text-[var(--dash-brand)]"
                  >
                    {uploadingBg ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Upload className="h-5 w-5" />
                    )}
                    {cardBgUrl ? "Changer l'image de fond" : "Téléverser une image de fond"}
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

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      className="dash-btn-primary flex-1"
                      onClick={() => saveCardBg(false)}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Continuer
                    </button>
                    <button
                      type="button"
                      className="dash-btn-secondary flex-1"
                      onClick={() => saveCardBg(true)}
                      disabled={saving}
                    >
                      Utiliser les valeurs par défaut
                    </button>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--dash-brand-soft)] text-[var(--dash-brand)]">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="dash-card-title">Sécurité du compte</h2>
                      <p className="dash-section-desc">
                        Vérifiez votre email et changez votre mot de passe si besoin.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[var(--dash-text)]">Email</label>
                    <input
                      type="email"
                      value={user?.email ?? ""}
                      readOnly
                      className="mt-1 w-full rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-secondary)] px-3 py-2.5 text-sm text-[var(--dash-text-secondary)]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--dash-text)]">
                      Nouveau mot de passe <span className="font-normal text-[var(--dash-text-secondary)]">(optionnel)</span>
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="8 caractères minimum"
                      className="mt-1 w-full rounded-xl border border-[var(--dash-border)] px-3 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--dash-text)]">Confirmer le mot de passe</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[var(--dash-border)] px-3 py-2.5 text-sm"
                    />
                  </div>

                  <button
                    type="button"
                    className="dash-btn-primary w-full"
                    onClick={() => void saveSecurity()}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Continuer
                  </button>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--dash-brand-soft)] text-[var(--dash-brand)]">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="dash-card-title">Votre boutique est prête !</h2>
                      <p className="dash-section-desc">
                        Partagez ces liens avec vos clients et votre équipe.
                      </p>
                    </div>
                  </div>

                  {clientLink && (
                    <div className="space-y-3 rounded-xl border border-[var(--dash-border)] p-4">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[var(--dash-brand)]" />
                        Lien clients
                      </p>
                      <div className="flex justify-center">
                        <QRCodeSVG value={clientLink} size={140} level="H" />
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
                        <a href={clientLink} target="_blank" rel="noopener noreferrer" className="dash-btn-secondary flex-1 !w-auto no-underline">
                          <ExternalLink className="h-4 w-4" />
                          Ouvrir
                        </a>
                      </div>
                    </div>
                  )}

                  {employeeLink && (
                    <div className="space-y-3 rounded-xl border border-[var(--dash-border)] p-4">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Users className="h-4 w-4 text-[var(--dash-brand)]" />
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
                        <a href={employeeLink} target="_blank" rel="noopener noreferrer" className="dash-btn-secondary flex-1 !w-auto no-underline">
                          <ExternalLink className="h-4 w-4" />
                          Ouvrir
                        </a>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    className="dash-btn-primary w-full"
                    onClick={() => void finish()}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Accéder au tableau de bord
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
