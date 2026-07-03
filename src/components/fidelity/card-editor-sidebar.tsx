import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  useGetSettings,
  useUpdateSettings,
} from "@/api";
import { useGetTrialStatus } from "@/api/tenant";
import { useCurrentTenant } from "@/lib/tenant-context";
import { useToast } from "@/hooks/use-toast";
import { uploadTenantAsset } from "@/lib/upload-tenant-asset";
import { extractBrandColorsFromImage } from "@/lib/extract-brand-colors";
import { getBrandingLimits } from "@/lib/branding-limits";
import { cardEditorToShopSettings } from "@/lib/card-editor-payload";
import {
  validateCardPrimaryColor,
  validateCardSecondaryColor,
} from "@/lib/card-color-contrast";
import { PLATFORM } from "@/lib/platform";
import { tenantClientLink } from "@/lib/links";
import StampMilestonesEditor from "@/components/fidelity/stamp-milestones-editor";
import AiCardDesigner from "@/components/fidelity/ai-card-designer";
import CardTemplatePicker from "@/components/fidelity/card-template-picker";
import type { StampMilestone } from "@/lib/stamp-milestones";
import { DEFAULT_CARD_DESIGN_ID } from "@/lib/card-templates";
import { clampMilestonesToThreshold } from "@/lib/stamp-milestones";
import { formatDzd } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Banknote,
  Check,
  ChevronDown,
  ChevronRight,
  Coins,
  Crown,
  ExternalLink,
  Gift,
  ImageIcon,
  Info,
  Loader2,
  Lock,
  Mail,
  Palette,
  Pencil,
  Plus,
  Settings2,
  SlidersHorizontal,
  Stamp,
  Upload,
} from "lucide-react";

const DEFAULT_PRIMARY = PLATFORM.primaryColor;
const DEFAULT_SECONDARY = PLATFORM.secondaryColor;

export type CardEditorState = {
  businessName: string;
  logoUrl: string;
  cardTemplateUrl: string;
  cardDesignId: string;
  primaryColor: string;
  secondaryColor: string;
  stampsEnabled: boolean;
  spendEnabled: boolean;
  stampThreshold: number;
  spendThresholdDzd: number;
  maxScansPerDay: number;
  rewardValue: string;
  stampMilestones: StampMilestone[];
  trackProducts: boolean;
  collectClientEmail: boolean;
};

type EditorDialog = "appearance" | "program" | "rewards" | "enrollment" | null;

type CardEditorSidebarProps = {
  state: CardEditorState;
  previewStamps: number;
  previewSpendDzd: number;
  onChange: (next: CardEditorState) => void;
  onPreviewStampsChange: (value: number) => void;
  onPreviewSpendDzdChange: (value: number) => void;
  onSaved?: (updatedAt: string) => void;
};

function ColorSwatch({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-4 w-4 rounded-full border border-black/10 shadow-sm"
      style={{ backgroundColor: color }}
    />
  );
}

export default function CardEditorSidebar({
  state,
  previewStamps,
  previewSpendDzd,
  onChange,
  onPreviewStampsChange,
  onPreviewSpendDzdChange,
  onSaved,
}: CardEditorSidebarProps) {
  const { data: settings } = useGetSettings();
  const { tenant } = useCurrentTenant();
  const { data: trialStatus } = useGetTrialStatus();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();

  const logoInputRef = useRef<HTMLInputElement>(null);
  const cardBgInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCardBg, setUploadingCardBg] = useState(false);
  const [openDialog, setOpenDialog] = useState<EditorDialog>(null);

  const planId = trialStatus?.planId ?? tenant?.planId ?? "trial";
  const limits = getBrandingLimits(planId);
  const milestoneCount = state.stampMilestones.filter((m) => m.label.trim()).length;
  const clientPortalUrl = tenant?.slug ? tenantClientLink(tenant.slug) : null;

  const patch = (partial: Partial<CardEditorState>) => onChange({ ...state, ...partial });

  const setPrimaryColor = (value: string) => {
    const error = validateCardPrimaryColor(value, state.secondaryColor, state.cardDesignId);
    if (error) {
      toast({ title: "Couleur illisible", description: error, variant: "destructive" });
      return;
    }
    patch({ primaryColor: value });
  };

  const setSecondaryColor = (value: string) => {
    const error = validateCardSecondaryColor(state.primaryColor, value, state.cardDesignId);
    if (error) {
      toast({ title: "Couleur illisible", description: error, variant: "destructive" });
      return;
    }
    patch({ secondaryColor: value });
  };

  const persistToDb = async (
    nextState: CardEditorState = state,
    options?: { message?: string; silent?: boolean; markClean?: boolean },
  ) => {
    if (!settings) return false;

    try {
      const saved = await updateSettings.mutateAsync({
        id: settings.id,
        data: cardEditorToShopSettings(nextState, limits, settings.businessName),
        syncTenantBranding: true,
      });
      if (options?.markClean) {
        onSaved?.(saved.updatedAt);
      }
      if (!options?.silent) {
        toast({
          title: options?.message ?? "Enregistré",
          description: "Données synchronisées en base.",
        });
      }
      return true;
    } catch {
      toast({ title: "Échec de l'enregistrement", variant: "destructive" });
      return false;
    }
  };

  const applyAndClose = async () => {
    const ok = await persistToDb(state, { silent: true, markClean: true });
    if (ok) {
      toast({ title: "Section enregistrée", description: "Modifications synchronisées." });
      setOpenDialog(null);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!tenant) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "Maximum 2 Mo", variant: "destructive" });
      return;
    }
    setUploadingLogo(true);
    try {
      const url = await uploadTenantAsset(tenant.id, "logo", file);
      const colors = await extractBrandColorsFromImage(file);
      const next = {
        ...state,
        logoUrl: url,
        primaryColor: colors.primary,
        secondaryColor: colors.secondary,
      };
      onChange(next);
      await persistToDb(next, { silent: true });
      toast({ title: "Logo téléversé et enregistré" });
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

  const handleCardBgUpload = async (file: File) => {
    if (!tenant || !limits.canCustomCardBackground) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "Maximum 5 Mo", variant: "destructive" });
      return;
    }
    setUploadingCardBg(true);
    try {
      const url = await uploadTenantAsset(tenant.id, "card-bg", file);
      const next = { ...state, cardTemplateUrl: url };
      onChange(next);
      await persistToDb(next, { silent: true });
      toast({ title: "Fond téléversé et enregistré" });
    } catch (e) {
      toast({
        title: "Échec upload",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setUploadingCardBg(false);
    }
  };

  const programSummary = (() => {
    const parts: string[] = [];
    if (state.stampsEnabled) parts.push(`${state.stampThreshold} tampons`);
    if (state.spendEnabled) parts.push(`${formatDzd(state.spendThresholdDzd)} dépensés`);
    if (parts.length === 0) parts.push("Aucun mode actif");
    return `${parts.join(" + ")} · ${state.maxScansPerDay} scan(s)/j`;
  })();

  const summaryRows: {
    id: EditorDialog;
    icon: typeof Palette;
    title: string;
    summary: string;
    extra?: React.ReactNode;
  }[] = [
    {
      id: "appearance",
      icon: Palette,
      title: "Apparence",
      summary: state.businessName || "Sans nom",
      extra: (
        <span className="flex items-center gap-1">
          <ColorSwatch color={state.primaryColor} />
          <ColorSwatch color={state.secondaryColor} />
        </span>
      ),
    },
    {
      id: "program",
      icon: Stamp,
      title: "Programme",
      summary: programSummary,
    },
    {
      id: "rewards",
      icon: Gift,
      title: "Récompenses",
      summary:
        milestoneCount > 0
          ? `${milestoneCount} prix sur la carte`
          : state.rewardValue.trim()
            ? `Finale : ${state.rewardValue.trim()}`
            : "Aucun prix défini",
    },
    {
      id: "enrollment",
      icon: Mail,
      title: "Inscription client",
      summary: state.collectClientEmail
        ? "Nom, téléphone et email"
        : "Nom et téléphone uniquement",
    },
  ];

  return (
    <>
      <aside className="dash-card-editor-sidebar">
        <div className="dash-card-editor-sidebar-head">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="dash-card-editor-sidebar-title">Réglages</h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {clientPortalUrl && (
                <a
                  href={clientPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dash-card-editor-menu-btn no-underline"
                  title="Ouvrir le portail client dans un nouvel onglet"
                >
                  <ExternalLink size={14} />
                  Voir comme client
                </a>
              )}
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="dash-card-editor-menu-btn">
                  <Plus size={14} />
                  Éditer
                  <ChevronDown size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Modifier la carte</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setOpenDialog("appearance")}>
                  <Palette className="mr-2 h-4 w-4" />
                  Apparence
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setOpenDialog("program")}>
                  <Stamp className="mr-2 h-4 w-4" />
                  Programme fidélité
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setOpenDialog("rewards")}>
                  <Gift className="mr-2 h-4 w-4" />
                  Récompenses
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setOpenDialog("enrollment")}>
                  <Mail className="mr-2 h-4 w-4" />
                  Inscription client
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </div>
        </div>

        <div className="dash-card-editor-sidebar-body">
          <CardTemplatePicker
            value={state.cardDesignId}
            primaryColor={state.primaryColor}
            secondaryColor={state.secondaryColor}
            limits={limits}
            onChange={(cardDesignId) => {
              const next = { ...state, cardDesignId };
              const primaryError = validateCardPrimaryColor(
                next.primaryColor,
                next.secondaryColor,
                cardDesignId,
              );
              const secondaryError = primaryError
                ? null
                : validateCardSecondaryColor(
                    next.primaryColor,
                    next.secondaryColor,
                    cardDesignId,
                  );
              if (primaryError || secondaryError) {
                toast({
                  title: "Couleurs incompatibles avec ce modèle",
                  description: primaryError ?? secondaryError ?? "",
                  variant: "destructive",
                });
                return;
              }
              onChange(next);
              void persistToDb(next, { silent: true });
            }}
          />

          {limits.canUseAiCardBuilder && (
          <AiCardDesigner
            state={state}
            limits={limits}
            tenantId={tenant?.id}
            onChange={onChange}
            onApplied={(next) => persistToDb(next, { silent: true })}
          />
          )}

          <div className="dash-card-editor-demo">
            <div className="flex items-center justify-between gap-2">
              <span className="dash-card-editor-demo-label">
                <SlidersHorizontal size={13} />
                Aperçu démo
              </span>
              <span className="text-xs font-semibold tabular-nums text-[var(--dash-brand)]">
                {state.spendEnabled && state.stampsEnabled
                  ? `${previewStamps}/${state.stampThreshold} · ${previewSpendDzd.toLocaleString("fr-DZ")} DZD`
                  : state.spendEnabled
                    ? `${previewSpendDzd.toLocaleString("fr-DZ")} / ${state.spendThresholdDzd.toLocaleString("fr-DZ")} DZD`
                    : `${previewStamps}/${state.stampThreshold}`}
              </span>
            </div>
            {state.stampsEnabled && (
              <input
                type="range"
                min={0}
                max={state.stampThreshold}
                value={previewStamps}
                onChange={(e) => onPreviewStampsChange(Number(e.target.value))}
                className="w-full accent-[var(--dash-brand)]"
              />
            )}
            {state.spendEnabled && (
              <input
                type="range"
                min={0}
                max={state.spendThresholdDzd}
                step={250}
                value={previewSpendDzd}
                onChange={(e) => onPreviewSpendDzdChange(Number(e.target.value))}
                className={`w-full accent-[var(--dash-brand)]${state.stampsEnabled ? " mt-2" : ""}`}
              />
            )}
          </div>

          <div className="dash-card-editor-rows">
            {summaryRows.map((row) => {
              const Icon = row.icon;
              return (
                <button
                  key={row.id}
                  type="button"
                  className="dash-card-editor-row"
                  onClick={() => setOpenDialog(row.id)}
                >
                  <span className="dash-card-editor-row-icon">
                    <Icon size={16} />
                  </span>
                  <span className="dash-card-editor-row-text">
                    <span className="dash-card-editor-row-title">{row.title}</span>
                    <span className="dash-card-editor-row-summary">{row.summary}</span>
                  </span>
                  {row.extra}
                  <ChevronRight size={16} className="dash-card-editor-row-chevron" />
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Appearance dialog */}
      <Dialog open={openDialog === "appearance"} onOpenChange={(o) => !o && setOpenDialog(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Apparence</DialogTitle>
            <DialogDescription>Nom, logo, couleurs et fond de carte.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium">Nom du commerce</label>
              <input
                className="mt-1 w-full rounded-xl border border-[var(--dash-border)] px-3 py-2.5 text-sm"
                value={state.businessName}
                maxLength={limits.maxBusinessNameLength}
                onChange={(e) => patch({ businessName: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Logo</label>
              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo || !tenant}
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-[var(--dash-border)] bg-[var(--dash-bg-secondary)] hover:border-[var(--dash-brand)]"
                >
                  {uploadingLogo ? (
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--dash-brand)]" />
                  ) : state.logoUrl ? (
                    <img src={state.logoUrl} alt="" className="h-full w-full rounded-xl object-contain p-1" />
                  ) : (
                    <Upload className="h-5 w-5 text-[var(--dash-text-secondary)]" />
                  )}
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleLogoUpload(f);
                    e.target.value = "";
                  }}
                />
                <div className="flex-1 space-y-2">
                  {limits.canUseExternalAssetUrls && (
                    <input
                      className="w-full rounded-xl border border-[var(--dash-border)] px-3 py-2 text-sm"
                      value={state.logoUrl}
                      onChange={(e) => patch({ logoUrl: e.target.value })}
                      placeholder="URL du logo"
                    />
                  )}
                  {state.logoUrl && (
                    <button
                      type="button"
                      className="text-xs text-[var(--dash-text-secondary)] hover:text-[var(--dash-brand)]"
                      onClick={() => patch({ logoUrl: "" })}
                    >
                      Supprimer le logo
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Couleur principale</label>
                <input
                  type="color"
                  className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-[var(--dash-border)]"
                  value={state.primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                />
                <p className="mt-1 text-xs text-[var(--dash-text-secondary)]">
                  Doit rester lisible sur le fond de la carte.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Couleur secondaire</label>
                <input
                  type="color"
                  className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-[var(--dash-border)]"
                  value={state.secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                />
              </div>
            </div>
            <div
              className={cn(
                "rounded-xl border p-3",
                limits.canCustomCardBackground
                  ? "border-[var(--dash-border)] bg-[var(--dash-bg-secondary)]"
                  : "border-amber-200 bg-amber-50",
              )}
            >
              <div className="flex items-start gap-2">
                {limits.canCustomCardBackground ? (
                  <ImageIcon size={16} className="text-[var(--dash-brand)] shrink-0 mt-0.5" />
                ) : (
                  <Lock size={16} className="text-amber-700 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">Fond de carte</p>
                  {limits.canCustomCardBackground ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="dash-btn-secondary !w-auto !min-h-0 px-3 py-1.5 text-xs"
                        disabled={uploadingCardBg}
                        onClick={() => cardBgInputRef.current?.click()}
                      >
                        {uploadingCardBg ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Téléverser"}
                      </button>
                      {state.cardTemplateUrl && (
                        <button
                          type="button"
                          className="dash-btn-secondary !w-auto !min-h-0 px-3 py-1.5 text-xs"
                          onClick={() => patch({ cardTemplateUrl: "" })}
                        >
                          Supprimer
                        </button>
                      )}
                      <input
                        ref={cardBgInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleCardBgUpload(f);
                          e.target.value = "";
                        }}
                      />
                    </div>
                  ) : (
                    <Link href="/dashboard/billing" className="dash-action-btn mt-2 inline-flex text-xs">
                      <Crown size={12} />
                      Plan Maison requis
                    </Link>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="dash-btn-primary"
              disabled={updateSettings.isPending}
              onClick={() => void applyAndClose()}
            >
              {updateSettings.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pencil className="h-4 w-4" />
              )}
              Appliquer et enregistrer
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Program dialog */}
      <Dialog open={openDialog === "program"} onOpenChange={(o) => !o && setOpenDialog(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Programme fidélité</DialogTitle>
            <DialogDescription>
              Activez un ou deux systèmes, puis configurez chaque bloc séparément.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <section>
              <p className="dash-loyalty-step-label">1 · Choisir le(s) système(s)</p>
              <div className="dash-loyalty-mode-grid">
                <button
                  type="button"
                  className={cn(
                    "dash-loyalty-mode-toggle dash-loyalty-mode-toggle--stamps",
                    state.stampsEnabled && "dash-loyalty-mode-toggle--active",
                  )}
                  onClick={() => {
                    if (state.stampsEnabled && !state.spendEnabled) return;
                    patch({ stampsEnabled: !state.stampsEnabled });
                  }}
                >
                  {state.stampsEnabled && (
                    <span className="dash-loyalty-mode-toggle-check" aria-hidden>
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                  <span className="dash-loyalty-mode-toggle-icon">
                    <Stamp size={16} />
                  </span>
                  <span className="text-sm font-semibold">Tampons</span>
                  <span className="text-xs text-[var(--dash-text-secondary)] leading-snug">
                    1 visite validée = 1 tampon
                  </span>
                </button>
                <button
                  type="button"
                  className={cn(
                    "dash-loyalty-mode-toggle dash-loyalty-mode-toggle--spend",
                    state.spendEnabled && "dash-loyalty-mode-toggle--active",
                  )}
                  onClick={() => {
                    if (state.spendEnabled && !state.stampsEnabled) return;
                    patch({ spendEnabled: !state.spendEnabled });
                  }}
                >
                  {state.spendEnabled && (
                    <span className="dash-loyalty-mode-toggle-check" aria-hidden>
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                  <span className="dash-loyalty-mode-toggle-icon">
                    <Coins size={16} />
                  </span>
                  <span className="text-sm font-semibold">Montant dépensé</span>
                  <span className="text-xs text-[var(--dash-text-secondary)] leading-snug">
                    Le worker saisit le montant à chaque achat
                  </span>
                </button>
              </div>
              {state.stampsEnabled && state.spendEnabled && (
                <div className="dash-loyalty-dual-note mt-3">
                  <Info size={15} />
                  <span>
                    Les deux systèmes sont <strong className="text-[var(--dash-text)]">indépendants</strong> mais
                    cumulés à chaque visite : tampon + montant enregistrés ensemble.
                  </span>
                </div>
              )}
            </section>

            {(state.stampsEnabled || state.spendEnabled) && (
              <section>
                <p className="dash-loyalty-step-label">2 · Configurer chaque système</p>
                <div className="space-y-3">
                  {state.stampsEnabled && (
                    <div className="dash-loyalty-mode-panel dash-loyalty-mode-panel--stamps">
                      <div className="dash-loyalty-mode-panel-head">
                        <span className="dash-loyalty-mode-panel-icon">
                          <Stamp size={15} />
                        </span>
                        <div className="min-w-0">
                          <p className="dash-loyalty-mode-panel-title">Système tampons</p>
                          <p className="dash-loyalty-mode-panel-desc">
                            Grille visible sur la carte · récompense au {state.stampThreshold}e tampon
                          </p>
                        </div>
                      </div>
                      <div className="dash-loyalty-mode-panel-body">
                        <div className="dash-loyalty-field">
                          <label htmlFor="stamp-threshold">
                            Tampons pour la récompense ({state.stampThreshold})
                          </label>
                          <input
                            id="stamp-threshold"
                            type="range"
                            min={3}
                            max={20}
                            value={state.stampThreshold}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              patch({
                                stampThreshold: v,
                                stampMilestones: clampMilestonesToThreshold(state.stampMilestones, v),
                              });
                              if (previewStamps > v) onPreviewStampsChange(v);
                            }}
                            className="w-full accent-amber-600"
                          />
                        </div>
                        <label className="flex items-start gap-2.5 cursor-pointer rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={state.trackProducts}
                            onChange={(e) => patch({ trackProducts: e.target.checked })}
                            className="mt-0.5 rounded accent-amber-600"
                          />
                          <span className="text-sm leading-snug">
                            <span className="font-medium block">Suivi des produits au scan</span>
                            <span className="text-xs text-[var(--dash-text-secondary)]">
                              Le worker choisit les articles avant d&apos;ajouter le tampon
                            </span>
                          </span>
                        </label>
                        <button
                          type="button"
                          className="dash-loyalty-link-btn"
                          onClick={() => {
                            setOpenDialog("rewards");
                          }}
                        >
                          Prix intermédiaires sur la carte
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {state.spendEnabled && (
                    <div className="dash-loyalty-mode-panel dash-loyalty-mode-panel--spend">
                      <div className="dash-loyalty-mode-panel-head">
                        <span className="dash-loyalty-mode-panel-icon">
                          <Banknote size={15} />
                        </span>
                        <div className="min-w-0">
                          <p className="dash-loyalty-mode-panel-title">Système montant dépensé</p>
                          <p className="dash-loyalty-mode-panel-desc">
                            Barre de progression en DZD sur la carte client
                          </p>
                        </div>
                      </div>
                      <div className="dash-loyalty-mode-panel-body">
                        <div className="dash-loyalty-field">
                          <label htmlFor="spend-threshold">Seuil de dépenses (DZD)</label>
                          <input
                            id="spend-threshold"
                            type="number"
                            min={500}
                            step={500}
                            value={state.spendThresholdDzd}
                            onChange={(e) =>
                              patch({ spendThresholdDzd: Math.max(500, Number(e.target.value) || 0) })
                            }
                            className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm"
                          />
                          <p className="dash-loyalty-field-hint">
                            Ex. {formatDzd(state.spendThresholdDzd)} cumulés → récompense débloquée, puis le compteur
                            repart à zéro.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            <section>
              <p className="dash-loyalty-step-label">3 · Paramètres communs</p>
              <div className="dash-loyalty-mode-panel dash-loyalty-mode-panel--general">
                <div className="dash-loyalty-mode-panel-head">
                  <span className="dash-loyalty-mode-panel-icon">
                    <Settings2 size={15} />
                  </span>
                  <div className="min-w-0">
                    <p className="dash-loyalty-mode-panel-title">Règles générales</p>
                    <p className="dash-loyalty-mode-panel-desc">
                      S&apos;appliquent à tous les modes actifs
                    </p>
                  </div>
                </div>
                <div className="dash-loyalty-mode-panel-body">
                  <div className="dash-loyalty-field">
                    <label htmlFor="max-scans">
                      Scans maximum par jour ({state.maxScansPerDay})
                    </label>
                    <input
                      id="max-scans"
                      type="range"
                      min={1}
                      max={10}
                      value={state.maxScansPerDay}
                      onChange={(e) => patch({ maxScansPerDay: Number(e.target.value) })}
                      className="w-full accent-[var(--dash-brand)]"
                    />
                    <p className="dash-loyalty-field-hint">
                      Limite anti-fraude : au-delà, le scan du jour est refusé.
                    </p>
                  </div>
                  <div className="dash-loyalty-field">
                    <label htmlFor="final-reward">Récompense finale</label>
                    <input
                      id="final-reward"
                      className="w-full rounded-xl border border-[var(--dash-border)] px-3 py-2.5 text-sm"
                      value={state.rewardValue}
                      onChange={(e) => patch({ rewardValue: e.target.value })}
                      placeholder="Ex. Café offert ou -20 %"
                    />
                    <p className="dash-loyalty-field-hint">
                      {state.stampsEnabled && state.spendEnabled
                        ? "Utilisée quand le client atteint le seuil de tampons ou le montant cumulé."
                        : state.spendEnabled
                          ? "Attribuée quand le montant cumulé atteint le seuil."
                          : state.stampsEnabled
                            ? "Attribuée au dernier tampon (ou via les prix intermédiaires)."
                            : "Activez au moins un système ci-dessus."}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <button
              type="button"
              className="dash-btn-primary"
              disabled={updateSettings.isPending}
              onClick={() => void applyAndClose()}
            >
              {updateSettings.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Appliquer et enregistrer
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enrollment dialog */}
      <Dialog open={openDialog === "enrollment"} onOpenChange={(o) => !o && setOpenDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Inscription client</DialogTitle>
            <DialogDescription>
              Choisissez les informations demandées quand un client crée sa carte via votre lien QR.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="dash-loyalty-mode-panel dash-loyalty-mode-panel--general">
              <div className="dash-loyalty-mode-panel-head">
                <span className="dash-loyalty-mode-panel-icon">
                  <Mail size={15} />
                </span>
                <div className="min-w-0">
                  <p className="dash-loyalty-mode-panel-title">Champs du formulaire</p>
                  <p className="dash-loyalty-mode-panel-desc">
                    Toujours demandés : nom et téléphone
                  </p>
                </div>
              </div>
              <div className="dash-loyalty-mode-panel-body">
                <label className="flex items-start gap-2.5 cursor-pointer rounded-lg border border-[var(--dash-border)] px-3 py-3">
                  <input
                    type="checkbox"
                    checked={state.collectClientEmail}
                    onChange={(e) => patch({ collectClientEmail: e.target.checked })}
                    className="mt-0.5 rounded accent-[var(--dash-brand)]"
                  />
                  <span className="text-sm leading-snug">
                    <span className="font-medium block">Collecter l&apos;email des clients</span>
                    <span className="text-xs text-[var(--dash-text-secondary)]">
                      Un champ email obligatoire apparaît à l&apos;inscription et est enregistré dans votre
                      liste clients.
                    </span>
                  </span>
                </label>
                <p className="dash-loyalty-field-hint !mt-0">
                  {state.collectClientEmail
                    ? "Les clients doivent renseigner un email valide pour créer leur carte."
                    : "Seuls le nom et le numéro de téléphone sont demandés à l'inscription."}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="dash-btn-primary"
              disabled={updateSettings.isPending}
              onClick={() => void applyAndClose()}
            >
              {updateSettings.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Appliquer et enregistrer
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rewards dialog */}
      <Dialog open={openDialog === "rewards"} onOpenChange={(o) => !o && setOpenDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Récompenses sur la carte</DialogTitle>
            <DialogDescription>
              {state.stampsEnabled && state.spendEnabled
                ? "Tampons intermédiaires + récompense au seuil de dépenses."
                : state.spendEnabled
                  ? "En mode montant, seule la récompense finale s'applique (réglée dans Programme)."
                  : "Prix attribués à des tampons précis."}
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            {state.spendEnabled && !state.stampsEnabled ? (
              <div className="rounded-xl border border-dashed border-[var(--dash-border)] p-4 text-sm text-[var(--dash-text-secondary)]">
                Récompense à {formatDzd(state.spendThresholdDzd)} dépensés :{" "}
                <span className="font-medium text-foreground">
                  {state.rewardValue.trim() || "Non définie"}
                </span>
              </div>
            ) : state.stampsEnabled ? (
              <StampMilestonesEditor
                hidePreview
                stampThreshold={state.stampThreshold}
                milestones={state.stampMilestones}
                primaryColor={state.primaryColor}
                onChange={(stampMilestones) => patch({ stampMilestones })}
              />
            ) : (
              <p className="text-sm text-[var(--dash-text-secondary)]">
                Activez les tampons dans Programme pour ajouter des récompenses intermédiaires.
              </p>
            )}
            <button
              type="button"
              className="dash-btn-primary mt-4"
              disabled={updateSettings.isPending}
              onClick={() => void applyAndClose()}
            >
              {updateSettings.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Appliquer et enregistrer
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function defaultCardEditorState(settings?: {
  businessName?: string;
  logoUrl?: string | null;
  cardTemplateUrl?: string | null;
  cardDesignId?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  stampsEnabled?: boolean;
  spendEnabled?: boolean;
  stampThreshold?: number;
  spendThresholdDzd?: number;
  maxScansPerDay?: number;
  rewardValue?: string | null;
  stampMilestones?: StampMilestone[];
  trackProducts?: boolean;
  collectClientEmail?: boolean;
}): CardEditorState {
  return {
    businessName: settings?.businessName ?? "",
    logoUrl: settings?.logoUrl ?? "",
    cardTemplateUrl: settings?.cardTemplateUrl ?? "",
    cardDesignId: settings?.cardDesignId ?? DEFAULT_CARD_DESIGN_ID,
    primaryColor: settings?.primaryColor ?? DEFAULT_PRIMARY,
    secondaryColor: settings?.secondaryColor ?? DEFAULT_SECONDARY,
    stampsEnabled: settings?.stampsEnabled !== false,
    spendEnabled: settings?.spendEnabled === true,
    stampThreshold: settings?.stampThreshold ?? 9,
    spendThresholdDzd: settings?.spendThresholdDzd ?? 10000,
    maxScansPerDay: settings?.maxScansPerDay ?? 2,
    rewardValue: settings?.rewardValue ?? "",
    stampMilestones: settings?.stampMilestones ?? [],
    trackProducts: settings?.trackProducts ?? true,
    collectClientEmail: settings?.collectClientEmail === true,
  };
}
