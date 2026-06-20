import { PlayCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useDashboardTour } from "@/lib/dashboard-tour-context";

type DashboardTutorialButtonProps = {
  className?: string;
  compact?: boolean;
};

export function DashboardTutorialButton({ className = "", compact = false }: DashboardTutorialButtonProps) {
  const { startTour } = useDashboardTour();
  const queryClient = useQueryClient();

  return (
    <button
      type="button"
      className={`dash-tutorial-btn ${compact ? "dash-tutorial-btn--compact" : ""} ${className}`.trim()}
      onClick={() => {
        void queryClient.invalidateQueries({ queryKey: ["tenant"] });
        startTour();
      }}
    >
      <PlayCircle className="h-4 w-4 shrink-0" aria-hidden />
      {!compact && <span>Revoir le tutoriel</span>}
      {compact && <span className="sr-only">Revoir le tutoriel</span>}
    </button>
  );
}
