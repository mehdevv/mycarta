import { useState } from "react";
import { Link } from "wouter";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { useAiCardDesign } from "@/api/card-ai";
import { useAiPromptQuota } from "@/hooks/use-ai-prompt-quota";
import { useToast } from "@/hooks/use-toast";
import { uploadTenantAsset } from "@/lib/upload-tenant-asset";
import type { CardEditorState } from "@/components/fidelity/card-editor-sidebar";
import type { BrandingLimits } from "@/lib/branding-limits";
import { cn } from "@/lib/utils";

const EXAMPLE_PROMPTS = [
  "Café parisien élégant, noir et doré, ambiance premium",
];

type AiCardDesignerProps = {
  state: CardEditorState;
  limits: BrandingLimits;
  tenantId: string | undefined;
  onChange: (next: CardEditorState) => void;
  onApplied?: (next: CardEditorState) => void | Promise<void>;
};

function svgToFile(svg: string): File {
  return new File([svg], `ai-card-${Date.now()}.svg`, { type: "image/svg+xml" });
}

export default function AiCardDesigner({
  state,
  limits,
  tenantId,
  onChange,
  onApplied,
}: AiCardDesignerProps) {
  const [prompt, setPrompt] = useState("");
  const aiDesign = useAiCardDesign();
  const { toast } = useToast();
  const { quota, consume } = useAiPromptQuota(limits.planId, tenantId);

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (trimmed.length < 8) {
      toast({
        title: "Description trop courte",
        description: "Décrivez le style souhaité en quelques mots.",
        variant: "destructive",
      });
      return;
    }

    if (quota.exhausted) {
      toast({
        title: "Quota journalier atteint",
        description: `Essai gratuit : ${quota.limit} générations IA par jour. Passez à un plan payant pour continuer.`,
        variant: "destructive",
      });
      return;
    }

    if (!consume()) {
      toast({
        title: "Quota journalier atteint",
        description: "Réessayez demain ou passez à un plan payant.",
        variant: "destructive",
      });
      return;
    }

    try {
      const design = await aiDesign.mutateAsync({
        prompt: trimmed,
        businessName: state.businessName,
        primaryColor: state.primaryColor,
        secondaryColor: state.secondaryColor,
        includeBackground: limits.canCustomCardBackground,
      });

      let next: CardEditorState = {
        ...state,
        primaryColor: design.primaryColor,
        secondaryColor: design.secondaryColor,
      };

      if (design.suggestedRewardValue && !state.rewardValue.trim()) {
        next = { ...next, rewardValue: design.suggestedRewardValue };
      }

      if (design.backgroundSvg && limits.canCustomCardBackground && tenantId) {
        try {
          const url = await uploadTenantAsset(tenantId, "card-bg", svgToFile(design.backgroundSvg));
          next = { ...next, cardTemplateUrl: url };
        } catch {
          toast({
            title: "Fond non enregistré",
            description: "Les couleurs ont été appliquées ; le fond SVG n'a pas pu être téléversé.",
            variant: "destructive",
          });
        }
      }

      onChange(next);
      await onApplied?.(next);

      toast({
        title: "Design appliqué",
        description: design.designSummary,
      });
    } catch (e) {
      toast({
        title: "Génération échouée",
        description: e instanceof Error ? e.message : "Réessayez dans un instant.",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="dash-ai-card">
      <div className="dash-ai-card-head">
        <span className="dash-ai-card-icon" aria-hidden>
          <Sparkles size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="dash-ai-card-title">Assistant IA</h3>
          <p className="dash-ai-card-desc">Décrivez le style — l&apos;IA applique couleurs et fond.</p>
        </div>
        {quota.isLimited && (
          <span
            className={cn(
              "dash-ai-card-quota",
              quota.exhausted && "dash-ai-card-quota--exhausted",
            )}
          >
            {quota.used}/{quota.limit} / jour
          </span>
        )}
      </div>

      <textarea
        className="dash-ai-card-input"
        rows={3}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ex. Carte minimaliste bleu marine et argent pour une boutique de mode…"
        disabled={aiDesign.isPending || quota.exhausted}
        maxLength={1200}
      />

      <div className="dash-ai-card-chips">
        {EXAMPLE_PROMPTS.map((example) => (
          <button
            key={example}
            type="button"
            className="dash-ai-card-chip"
            disabled={aiDesign.isPending || quota.exhausted}
            onClick={() => setPrompt(example)}
          >
            {example.length > 42 ? `${example.slice(0, 42)}…` : example}
          </button>
        ))}
      </div>

      {!limits.canCustomCardBackground && (
        <p className="dash-ai-card-note">
          Plan Maison requis pour un fond personnalisé — l&apos;IA appliquera les couleurs.
        </p>
      )}

      {quota.exhausted ? (
        <div className="dash-ai-card-quota-block">
          <p className="dash-ai-card-note">
            Vous avez utilisé vos {quota.limit} prompts IA aujourd&apos;hui. Le quota se réinitialise demain.
          </p>
          <Link href="/dashboard/billing" className="dash-btn-secondary dash-ai-card-btn no-underline">
            Passer à un plan payant
          </Link>
        </div>
      ) : (
        <button
          type="button"
          className={cn("dash-btn-primary dash-ai-card-btn", aiDesign.isPending && "opacity-80")}
          disabled={aiDesign.isPending || !prompt.trim()}
          onClick={() => void handleGenerate()}
        >
          {aiDesign.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4" />
          )}
          {aiDesign.isPending ? "Génération…" : "Générer avec l'IA"}
        </button>
      )}
    </section>
  );
}
