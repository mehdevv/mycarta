import { ExternalLink, Youtube } from "lucide-react";
import IntegrationVideoCard from "@/components/integrations/integration-video-card";
import { APP_TUTORIAL_CHANNEL_URL, APP_TUTORIAL_VIDEOS } from "@/lib/app-tutorials";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";
import tutorialsWaveBg from "@/assets/Untitled design (7).png";

type AppTutorialVideosProps = {
  variant: "landing" | "dashboard";
  className?: string;
};

export default function AppTutorialVideos({ variant, className }: AppTutorialVideosProps) {
  const { t } = useLocale();
  const prefix = variant === "landing" ? "landing.tutorials" : "dashboard.overview.tutorials";

  if (APP_TUTORIAL_VIDEOS.length === 0) return null;

  const videoGrid = (
    <div
      className={cn(
        "dash-video-grid",
        variant === "landing" && "landing-tutorials-grid",
        APP_TUTORIAL_VIDEOS.length === 1 && "dash-video-grid--single",
      )}
    >
      {APP_TUTORIAL_VIDEOS.map((video, index) => (
        <IntegrationVideoCard
          key={video.id}
          tutorial={{
            id: video.id,
            youtubeId: video.youtubeId,
            duration: video.duration,
            title:
              index === 0
                ? t(`${prefix}.videoTitle`)
                : t(`${prefix}.videoTitleNumbered`, { number: index + 1 }),
            description:
              index === 0
                ? t(`${prefix}.videoDescription`)
                : t(`${prefix}.videoDescriptionNumbered`, { number: index + 1 }),
          }}
        />
      ))}
    </div>
  );

  return (
    <section
      id={variant === "landing" ? "tutorials" : undefined}
      className={cn(
        variant === "landing" ? "landing-tutorials" : "dash-overview-tutorials",
        className,
      )}
      aria-labelledby={variant === "landing" ? "landing-tutorials-title" : "dash-tutorials-title"}
    >
      <div className={variant === "landing" ? "container-page" : undefined}>
        <div className={variant === "landing" ? "landing-tutorials-head" : "dash-section-head"}>
          <div>
            <p className={variant === "landing" ? "landing-eyebrow" : "dash-page-eyebrow"}>
              {t(`${prefix}.eyebrow`)}
            </p>
            <h2
              id={variant === "landing" ? "landing-tutorials-title" : "dash-tutorials-title"}
              className={variant === "landing" ? "landing-h2" : "dash-section-title flex items-center gap-2"}
            >
              {variant === "dashboard" && (
                <Youtube size={20} className="text-[var(--dash-brand)] shrink-0" aria-hidden />
              )}
              {t(`${prefix}.title`)}
            </h2>
            <p className="landing-tutorials-desc">{t(`${prefix}.description`)}</p>
          </div>
          <a
            href={APP_TUTORIAL_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-2 shrink-0",
              variant === "landing" ? "landing-tutorials-channel" : "dash-tutorials-channel",
            )}
          >
            {t(`${prefix}.watchChannel`)}
            <ExternalLink size={14} aria-hidden />
          </a>
        </div>

        {variant === "landing" ? (
          <div className="landing-tutorials-media">
            <div className="landing-tutorials-wave" aria-hidden>
              <img src={tutorialsWaveBg} alt="" loading="lazy" decoding="async" />
            </div>
            {videoGrid}
          </div>
        ) : (
          videoGrid
        )}
      </div>
    </section>
  );
}
