import { useMemo, useState } from "react";
import { Check, LayoutTemplate, Search } from "lucide-react";
import { CARD_TEMPLATES, getAvailableCardTemplates, getCardTemplate, type CardTemplate } from "@/lib/card-templates";
import type { BrandingLimits } from "@/lib/branding-limits";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CardTemplatePickerProps = {
  value: string;
  onChange: (templateId: string) => void;
  primaryColor: string;
  secondaryColor: string;
  limits: BrandingLimits;
};

const CATEGORIES = ["Tous", "classique", "moderne", "ludique", "premium"] as const;

function TemplateThumb({
  template,
  primaryColor,
  secondaryColor,
  selected,
  onSelect,
}: {
  template: CardTemplate;
  primaryColor: string;
  secondaryColor: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "card-tpl-picker-item",
        selected && "card-tpl-picker-item--selected",
      )}
      aria-pressed={selected}
    >
      <div
        className={cn(
          "card-tpl-picker-preview",
          `card-tpl--layout-${template.layout}`,
          `card-tpl--progress-${template.progressStyle}`,
        )}
      >
        <div
          className="card-tpl-picker-bg"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}55 0%, ${secondaryColor}33 100%)`,
          }}
        />
        <div className="card-tpl-picker-qr" />
        <div className="card-tpl-picker-stamps">
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className={cn("card-tpl-picker-stamp", `stamp-grid--${template.stampStyle}`)}
              style={{
                borderColor: i < 2 ? primaryColor : "#d1d5db",
                backgroundColor: i < 2 ? `${primaryColor}22` : "#fff",
              }}
            />
          ))}
        </div>
        <div
          className="card-tpl-picker-bar"
          style={{ background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})` }}
        />
      </div>
      <div className="card-tpl-picker-meta">
        <span className="card-tpl-picker-name">{template.name}</span>
        <span className="card-tpl-picker-desc">{template.description}</span>
      </div>
      {selected && (
        <span className="card-tpl-picker-check" aria-hidden>
          <Check size={14} />
        </span>
      )}
    </button>
  );
}

export default function CardTemplatePicker({
  value,
  onChange,
  primaryColor,
  secondaryColor,
  limits,
}: CardTemplatePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Tous");

  const catalog = getAvailableCardTemplates({
    canBrowseTemplates: limits.canBrowseCardTemplates,
    canUseExclusiveTemplates: limits.canUseExclusiveTemplates,
  });

  const active = getCardTemplate(value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((t) => {
      if (category !== "Tous" && t.category !== category) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.id.includes(q)
      );
    });
  }, [query, category, catalog]);

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  if (!limits.canBrowseCardTemplates) {
    return (
      <div className="card-tpl-picker-summary">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="dash-card-editor-row-icon shrink-0">
            <LayoutTemplate size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--dash-text)]">Carte standard</p>
            <p className="text-xs text-[var(--dash-text-secondary)] mt-0.5">
              Modèle fixe inclus — passez au plan Maison pour l&apos;AI Card Builder et les modèles.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card-tpl-picker-summary">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="dash-card-editor-row-icon shrink-0">
            <LayoutTemplate size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--dash-text)]">Modèle de carte</p>
            <p className="text-xs text-[var(--dash-text-secondary)] mt-0.5 truncate">
              {active.name} — {active.description}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="dash-btn-secondary !w-full !min-h-0 mt-3 text-xs"
          onClick={() => setOpen(true)}
        >
          <LayoutTemplate size={14} />
          Parcourir les {catalog.length} modèles
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-[var(--dash-border)] shrink-0">
            <DialogTitle>Modèles de carte fidélité</DialogTitle>
            <DialogDescription>
              Choisissez un style de tampons et de mise en page — {catalog.length} designs disponibles.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-3 border-b border-[var(--dash-border)] flex flex-col sm:flex-row gap-3 shrink-0">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dash-text-secondary)]"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un modèle…"
                className="w-full rounded-xl border border-[var(--dash-border)] pl-9 pr-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                    category === cat
                      ? "bg-[var(--dash-brand-soft)] border-[var(--dash-brand)] text-[var(--dash-brand-hover)]"
                      : "bg-white border-[var(--dash-border)] text-[var(--dash-text-secondary)]",
                  )}
                >
                  {cat === "Tous" ? "Tous" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-y-auto flex-1 px-6 py-4">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-[var(--dash-text-secondary)] py-12">
                Aucun modèle ne correspond à votre recherche.
              </p>
            ) : (
              <div className="card-tpl-picker-grid">
                {filtered.map((template) => (
                  <TemplateThumb
                    key={template.id}
                    template={template}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    selected={value === template.id}
                    onSelect={() => handleSelect(template.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
