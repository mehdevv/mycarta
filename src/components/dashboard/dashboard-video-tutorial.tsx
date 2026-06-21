import { Play, Youtube } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { APP_TUTORIAL_VIDEOS } from "@/lib/app-tutorials";
import { useDashboardTour } from "@/lib/dashboard-tour-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

export function DashboardVideoTutorialChip({ className }: { className?: string }) {
  const { t } = useLocale();
  const { openVideoTutorial } = useDashboardTour();
  const video = APP_TUTORIAL_VIDEOS[0];
  if (!video) return null;

  return (
    <button
      type="button"
      className={cn("dash-video-chip", className)}
      onClick={openVideoTutorial}
      aria-label={t("dashboard.overview.tutorials.watchVideo")}
    >
      <span className="dash-video-chip-icon" aria-hidden>
        <Youtube className="h-4 w-4" />
      </span>
      <span className="dash-video-chip-copy">
        <span className="dash-video-chip-label">{t("dashboard.overview.tutorials.chipLabel")}</span>
        <span className="dash-video-chip-hint">{t("dashboard.overview.tutorials.chipHint")}</span>
      </span>
      <span className="dash-video-chip-play" aria-hidden>
        <Play className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

export function DashboardVideoTutorialModal() {
  const { t } = useLocale();
  const { videoTutorialOpen, closeVideoTutorial } = useDashboardTour();
  const video = APP_TUTORIAL_VIDEOS[0];
  if (!video) return null;

  const embedUrl = `https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0`;

  return (
    <Dialog open={videoTutorialOpen} onOpenChange={(open) => !open && closeVideoTutorial()}>
      <DialogContent className="dash-video-modal sm:max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 text-left">
          <DialogTitle>{t("dashboard.overview.tutorials.videoTitle")}</DialogTitle>
          <DialogDescription>{t("dashboard.overview.tutorials.videoDescription")}</DialogDescription>
        </DialogHeader>
        <div className="dash-video-modal-embed-wrap">
          <iframe
            src={embedUrl}
            title={t("dashboard.overview.tutorials.videoTitle")}
            className="dash-video-modal-embed"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
