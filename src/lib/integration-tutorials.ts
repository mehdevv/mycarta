/** When true, the integrations page and sidebar entry are locked for all owners. */
export const INTEGRATIONS_LOCKED = true;

/** @deprecated Use INTEGRATIONS_LOCKED */
export const INTEGRATIONS_API_LOCKED = INTEGRATIONS_LOCKED;

export type IntegrationTutorial = {
  id: string;
  title: string;
  description: string;
  /** YouTube video ID (the part after watch?v=) */
  youtubeId: string;
  duration?: string;
};

/**
 * Replace youtubeId values with your official tutorial videos.
 * Optional env overrides: VITE_TUTORIAL_WHATSAPP_YT, VITE_TUTORIAL_EMAIL_YT, VITE_TUTORIAL_OVERVIEW_YT
 */
export const INTEGRATION_TUTORIALS: IntegrationTutorial[] = [
  {
    id: "overview",
    title: "Vue d'ensemble des intégrations",
    description: "Découvrez comment connecter WhatsApp et l'email à votre programme fidélité.",
    youtubeId:
      (import.meta.env.VITE_TUTORIAL_OVERVIEW_YT as string | undefined) || "jNQXAC9IVRw",
    duration: "5 min",
  },
  {
    id: "whatsapp",
    title: "Configurer WhatsApp Business API",
    description: "Créer une app Meta, obtenir le jeton et lier votre numéro professionnel.",
    youtubeId:
      (import.meta.env.VITE_TUTORIAL_WHATSAPP_YT as string | undefined) || "8aRKYdeqKJ0",
    duration: "12 min",
  },
  {
    id: "email",
    title: "Configurer l'expéditeur email",
    description: "Valider votre domaine et préparer les campagnes clients par email.",
    youtubeId:
      (import.meta.env.VITE_TUTORIAL_EMAIL_YT as string | undefined) || "k0H8J3L3y1U",
    duration: "8 min",
  },
];
