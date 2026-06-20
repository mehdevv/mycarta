import type { IntegrationTutorial } from "@/lib/integration-tutorials";

type IntegrationVideoCardProps = {
  tutorial: IntegrationTutorial;
};

export default function IntegrationVideoCard({ tutorial }: IntegrationVideoCardProps) {
  const embedUrl = `https://www.youtube-nocookie.com/embed/${tutorial.youtubeId}?rel=0`;

  return (
    <article className="dash-card dash-video-card">
      <div className="dash-video-embed-wrap">
        <iframe
          src={embedUrl}
          title={tutorial.title}
          className="dash-video-embed"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      <div className="dash-video-card-body">
        <div className="flex items-start justify-between gap-3">
          <h3 className="dash-video-card-title">{tutorial.title}</h3>
          {tutorial.duration && (
            <span className="dash-badge dash-badge--muted shrink-0">{tutorial.duration}</span>
          )}
        </div>
        <p className="dash-video-card-desc">{tutorial.description}</p>
      </div>
    </article>
  );
}
