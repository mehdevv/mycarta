import { PLATFORM } from "@/lib/platform";

export type AppTutorialVideo = {
  id: string;
  youtubeId: string;
  duration?: string;
};

function parseTutorialIds(): string[] {
  const list = (import.meta.env.VITE_APP_TUTORIAL_YT_IDS as string | undefined)?.trim();
  if (list) {
    return list
      .split(/[,;\s]+/)
      .map((id) => id.trim())
      .filter(Boolean);
  }

  const single = (import.meta.env.VITE_APP_TUTORIAL_YT_ID as string | undefined)?.trim();
  if (single) return [single];

  // Carta App — https://www.youtube.com/channel/UCXpwTn7UuyVS284a0q24NRA
  return ["b1KZ21Nun3o"];
}

export const APP_TUTORIAL_CHANNEL_URL = PLATFORM.social.youtube;

export const APP_TUTORIAL_VIDEOS: AppTutorialVideo[] = parseTutorialIds().map((youtubeId, index) => ({
  id: `app-tutorial-${index + 1}`,
  youtubeId,
  duration: index === 0 ? undefined : undefined,
}));
