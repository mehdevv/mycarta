import { useMemo, useEffect } from "react";
import { useGetSettings } from "@/api";

export type ClientLanguage = "fr" | "en";

const messages = {
  en: {
    loading: "Loading…",
    loadingCard: "Loading your card…",
    loadingReward: "Loading reward…",
    invalidCardLink: "Invalid card link",
    invalidRewardLink: "Invalid reward link",
    cardNotFound: "Card not found",
    cardNotFoundDesc: "This loyalty card doesn't exist or was removed.",
    getNewCard: "Get a new card",
    share: "Share",
    save: "Save",
    shareCard: "Share card",
    saveCard: "Save card",
    loyaltyCardTitle: "{business} Loyalty Card",
    rewardReady: "Reward ready!",
    progress: "Progress",
    showQrHint: "Show this QR at the counter to collect stamps",
    recentVisits: "Last hour",
    blocked: "Blocked",
    saveLinkProminent: "Save this link — you'll need it to open your card again",
    cardNumber: "Card number",
    copyLink: "Copy link",
    copied: "Copied!",
    getFreeCard: "Get your free loyalty card",
    enrolDesc: "Fill in your details — your card opens instantly with a short link to save.",
    fullName: "Full name",
    yourName: "Your name",
    phone: "Phone",
    phonePlaceholder: "0555 123 456",
    createMyCard: "Create My Card",
    creatingCard: "Creating your card…",
    alreadyHaveCard: "Already have a card?",
    sixDigitPlaceholder: "6-digit number",
    open: "Open",
    welcomeBack: "Welcome back!",
    openingExisting: "Opening your existing card.",
    couldNotCreate: "Could not create card",
    invalidCardNumber: "Invalid card number",
    enterSixDigits: "Enter your 6-digit card number.",
    nameMinLength: "Name must be at least 2 characters.",
    phoneRequired: "Phone number is required.",
    milestoneHint: "{remaining} more stamp(s) until: {label}",
    milestoneHintOne: "1 more stamp until: {label}",
    noRewardWaiting: "No reward waiting",
    noRewardDesc: "You don't have a prize to claim right now. Keep collecting stamps!",
    backToMyCard: "Back to my card",
    myCard: "My card",
    yourPrize: "Your prize",
    earnedOn: "Earned {date}",
    showStaffCode: "Show staff this code",
    staffRedeemHint: "Staff will mark this as redeemed when you collect your prize.",
    backToLoyaltyCard: "Back to loyalty card",
  },
  fr: {
    loading: "Chargement…",
    loadingCard: "Chargement de votre carte…",
    loadingReward: "Chargement de la récompense…",
    invalidCardLink: "Lien de carte invalide",
    invalidRewardLink: "Lien de récompense invalide",
    cardNotFound: "Carte introuvable",
    cardNotFoundDesc: "Cette carte de fidélité n'existe pas ou a été supprimée.",
    getNewCard: "Obtenir une nouvelle carte",
    share: "Partager",
    save: "Enregistrer",
    shareCard: "Partager la carte",
    saveCard: "Enregistrer la carte",
    loyaltyCardTitle: "Carte fidélité {business}",
    rewardReady: "Récompense prête !",
    progress: "Progression",
    showQrHint: "Montrez ce QR au comptoir pour collecter des tampons",
    recentVisits: "Dernière heure",
    blocked: "Bloqué",
    saveLinkProminent: "Enregistrez ce lien — vous en aurez besoin pour rouvrir votre carte",
    cardNumber: "Numéro de carte",
    copyLink: "Copier le lien",
    copied: "Copié !",
    getFreeCard: "Obtenez votre carte de fidélité gratuite",
    enrolDesc: "Renseignez vos informations — votre carte s'ouvre tout de suite avec un lien court à enregistrer.",
    fullName: "Nom complet",
    yourName: "Votre nom",
    phone: "Téléphone",
    phonePlaceholder: "0555 123 456",
    createMyCard: "Créer ma carte",
    creatingCard: "Création de votre carte…",
    alreadyHaveCard: "Vous avez déjà une carte ?",
    sixDigitPlaceholder: "Numéro à 6 chiffres",
    open: "Ouvrir",
    welcomeBack: "Bon retour !",
    openingExisting: "Ouverture de votre carte existante.",
    couldNotCreate: "Impossible de créer la carte",
    invalidCardNumber: "Numéro de carte invalide",
    enterSixDigits: "Entrez votre numéro de carte à 6 chiffres.",
    nameMinLength: "Le nom doit contenir au moins 2 caractères.",
    phoneRequired: "Le numéro de téléphone est requis.",
    milestoneHint: "Encore {remaining} tampon(s) avant : {label}",
    milestoneHintOne: "Encore 1 tampon avant : {label}",
    noRewardWaiting: "Aucune récompense en attente",
    noRewardDesc: "Vous n'avez pas de prix à réclamer pour le moment. Continuez à collecter des tampons !",
    backToMyCard: "Retour à ma carte",
    myCard: "Ma carte",
    yourPrize: "Votre prix",
    earnedOn: "Obtenu le {date}",
    showStaffCode: "Montrez ce code au personnel",
    staffRedeemHint: "Le personnel marquera la récompense comme utilisée lors de la remise du prix.",
    backToLoyaltyCard: "Retour à la carte fidélité",
  },
} as const;

export type ClientMessageKey = keyof typeof messages.en;

export function normalizeClientLanguage(value: unknown): ClientLanguage {
  return value === "en" ? "en" : "fr";
}

export function clientT(lang: ClientLanguage) {
  const dict = messages[lang];
  return (key: ClientMessageKey, params?: Record<string, string | number>) => {
    let text: string = dict[key];
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  };
}

export function useClientI18n() {
  const { data: settings, isLoading } = useGetSettings();
  const lang = normalizeClientLanguage(settings?.clientLanguage);
  const t = useMemo(() => clientT(lang), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return { lang, t, isLoading };
}

export function nextMilestoneHintText(
  currentStamps: number,
  stampThreshold: number,
  milestones: { position: number; label: string }[],
  t: ReturnType<typeof clientT>,
): string | null {
  const upcoming = milestones
    .filter((m) => m.position > currentStamps && m.position <= stampThreshold)
    .sort((a, b) => a.position - b.position)[0];
  if (!upcoming) return null;
  const remaining = upcoming.position - currentStamps;
  if (remaining === 1) {
    return t("milestoneHintOne", { label: upcoming.label });
  }
  return t("milestoneHint", { remaining, label: upcoming.label });
}
