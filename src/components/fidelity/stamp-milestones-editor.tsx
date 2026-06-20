import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StampMilestone } from "@/lib/stamp-milestones";
import { clampMilestonesToThreshold, getMilestoneAt } from "@/lib/stamp-milestones";
import { Gift, Plus, Trash2 } from "lucide-react";

type Props = {
  stampThreshold: number;
  milestones: StampMilestone[];
  primaryColor?: string;
  onChange: (milestones: StampMilestone[]) => void;
  hidePreview?: boolean;
};

export default function StampMilestonesEditor({
  stampThreshold,
  milestones,
  primaryColor = "#1A56DB",
  onChange,
  hidePreview = false,
}: Props) {
  const clamped = clampMilestonesToThreshold(milestones, stampThreshold);
  const usedPositions = new Set(clamped.map((m) => m.position));
  const nextFree =
    Array.from({ length: stampThreshold }, (_, i) => i + 1).find((p) => !usedPositions.has(p)) ?? 1;

  const addMilestone = () => {
    if (usedPositions.size >= stampThreshold) return;
    onChange(
      [...clamped, { position: nextFree, label: "" }].sort((a, b) => a.position - b.position),
    );
  };

  const updateMilestone = (position: number, patch: Partial<StampMilestone>) => {
    onChange(
      clamped
        .map((m) => (m.position === position ? { ...m, ...patch } : m))
        .sort((a, b) => a.position - b.position),
    );
  };

  const removeMilestone = (position: number) => {
    onChange(clamped.filter((m) => m.position !== position));
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base">Récompenses sur la carte</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Placez un prix sur n&apos;importe quel tampon (ex. 3e = -30 %, 5e = glace offerte).
        </p>
      </div>

      {!hidePreview && (
        <div
          className="rounded-xl border bg-muted/30 p-4"
          aria-label="Aperçu carte"
        >
          <p className="text-xs font-medium text-muted-foreground mb-3 text-center">Aperçu</p>
          <div className="grid grid-cols-5 gap-2 max-w-xs mx-auto">
            {Array.from({ length: stampThreshold }, (_, i) => {
              const position = i + 1;
              const prize = getMilestoneAt(clamped, position);
              return (
                <div key={position} className="flex flex-col items-center gap-1 min-h-[4.5rem]">
                  <div
                    className="w-full aspect-square rounded-full border-2 flex items-center justify-center text-xs font-semibold"
                    style={{
                      borderColor: prize ? primaryColor : "#E5E7EB",
                      backgroundColor: prize ? `${primaryColor}18` : "transparent",
                      color: prize ? primaryColor : "#9CA3AF",
                    }}
                  >
                    {prize ? <Gift className="h-4 w-4" /> : position}
                  </div>
                  <span className="text-[10px] text-center leading-tight text-amber-800 font-medium line-clamp-2 w-full">
                    {prize?.label || ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {clamped.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
            Aucune récompense. Ajoutez un prix sur un tampon.
          </p>
        )}
        {clamped.map((m) => (
          <div key={m.position} className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="w-full sm:w-32">
              <Label className="text-xs">Tampon #</Label>
              <Select
                value={String(m.position)}
                onValueChange={(v) => {
                  const newPos = Number(v);
                  const others = clamped.filter((x) => x.position !== m.position);
                  if (others.some((x) => x.position === newPos)) return;
                  updateMilestone(m.position, { position: newPos });
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: stampThreshold }, (_, i) => i + 1).map((p) => (
                    <SelectItem
                      key={p}
                      value={String(p)}
                      disabled={p !== m.position && usedPositions.has(p)}
                    >
                      Tampon {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs">Récompense</Label>
              <Input
                className="mt-1"
                placeholder="Ex. -30 %, Glace offerte"
                value={m.label}
                onChange={(e) => updateMilestone(m.position, { label: e.target.value })}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-destructive hover:text-destructive"
              onClick={() => removeMilestone(m.position)}
              aria-label={`Remove prize on stamp ${m.position}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={addMilestone}
        disabled={usedPositions.size >= stampThreshold}
      >
        <Plus className="h-4 w-4 mr-2" />
        Ajouter une récompense
      </Button>
    </div>
  );
}
