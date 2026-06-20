import { Loader2 } from "lucide-react";

export default function DashboardBootScreen({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="dash-shell flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--dash-brand)]" />
        <p className="text-sm text-[var(--dash-text-secondary)]">{label}</p>
      </div>
    </div>
  );
}
