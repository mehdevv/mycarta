import { useMemo, useEffect } from "react";
import { useGetSettings } from "@/api";

export type ClientLanguage = "fr" | "en" | "ar";

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
    spendProgress: "Spending",
    showQrHint: "Show this QR at the counter to collect stamps",
    spendQrHint: "Show this QR at the counter — your purchases count toward your reward",
    spendRewardHint: "{remaining} more to unlock: {label}",
    spendRewardUpcoming: "Spend goal",
    recentVisits: "Last hour",
    blocked: "Blocked",
    saveLinkProminent: "Save this link — you'll need it to open your card again",
    cardNumber: "Card number",
    cardIdLabel: "ID",
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
    email: "Email",
    emailPlaceholder: "you@example.com",
    emailRequired: "Email is required.",
    emailInvalid: "Enter a valid email address.",
    contactOwnerTitle: "Contact the {shop} owner",
    contactOwnerDesc: "The loyalty program is temporarily unavailable. Please reach out to the shop directly.",
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
    myRewards: "My rewards",
    rewardPending: "To redeem",
    rewardRedeemed: "Redeemed",
    tapToRedeem: "Tap to show QR code",
    rewardEnjoy: "Enjoy your reward!",
    rewardRedeemedDesc: "This prize has been collected. Thank you for your loyalty!",
    waitingForStaff: "Waiting for staff to scan…",
    rewardAlreadyRedeemed: "Already redeemed",
    rewardUpcoming: "Stamp {position}",
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
    spendProgress: "Dépenses",
    showQrHint: "Montrez ce QR au comptoir pour collecter des tampons",
    spendQrHint: "Montrez ce QR au comptoir — vos achats comptent pour la récompense",
    spendRewardHint: "Encore {remaining} avant : {label}",
    spendRewardUpcoming: "Objectif dépenses",
    recentVisits: "Dernière heure",
    blocked: "Bloqué",
    saveLinkProminent: "Enregistrez ce lien — vous en aurez besoin pour rouvrir votre carte",
    cardNumber: "Numéro de carte",
    cardIdLabel: "ID",
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
    email: "Email",
    emailPlaceholder: "vous@exemple.com",
    emailRequired: "L'email est requis.",
    emailInvalid: "Adresse email invalide.",
    contactOwnerTitle: "Contactez le propriétaire de {shop}",
    contactOwnerDesc: "Le programme fidélité est momentanément indisponible. Merci de contacter le commerce directement.",
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
    myRewards: "Mes récompenses",
    rewardPending: "À utiliser",
    rewardRedeemed: "Utilisée",
    tapToRedeem: "Appuyez pour afficher le QR",
    rewardEnjoy: "Profitez de votre récompense !",
    rewardRedeemedDesc: "Ce prix a été récupéré. Merci pour votre fidélité !",
    waitingForStaff: "En attente du scan par le personnel…",
    rewardAlreadyRedeemed: "Déjà utilisée",
    rewardUpcoming: "Stamp {position}",
  },
  ar: {
    loading: "جاري التحميل…",
    loadingCard: "جاري تحميل بطاقتك…",
    loadingReward: "جاري تحميل المكافأة…",
    invalidCardLink: "رابط البطاقة غير صالح",
    invalidRewardLink: "رابط المكافأة غير صالح",
    cardNotFound: "البطاقة غير موجودة",
    cardNotFoundDesc: "بطاقة الولاء هذه غير موجودة أو تم حذفها.",
    getNewCard: "الحصول على بطاقة جديدة",
    share: "مشاركة",
    save: "حفظ",
    shareCard: "مشاركة البطاقة",
    saveCard: "حفظ البطاقة",
    loyaltyCardTitle: "بطاقة ولاء {business}",
    rewardReady: "المكافأة جاهزة!",
    progress: "التقدم",
    showQrHint: "اعرض رمز QR عند الكاونتر لجمع الأختام",
    recentVisits: "الساعة الأخيرة",
    blocked: "محظور",
    saveLinkProminent: "احفظ هذا الرابط — ستحتاجه لفتح بطاقتك مجدداً",
    cardNumber: "رقم البطاقة",
    cardIdLabel: "المعرّف",
    copyLink: "نسخ الرابط",
    copied: "تم النسخ!",
    getFreeCard: "احصل على بطاقة الولاء المجانية",
    enrolDesc: "أدخل بياناتك — تُفتح بطاقتك فوراً مع رابط قصير للحفظ.",
    fullName: "الاسم الكامل",
    yourName: "اسمك",
    phone: "الهاتف",
    phonePlaceholder: "0555 123 456",
    createMyCard: "إنشاء بطاقتي",
    creatingCard: "جاري إنشاء بطاقتك…",
    alreadyHaveCard: "لديك بطاقة بالفعل؟",
    sixDigitPlaceholder: "رقم من 6 أرقام",
    open: "فتح",
    welcomeBack: "مرحباً بعودتك!",
    openingExisting: "جاري فتح بطاقتك الحالية.",
    couldNotCreate: "تعذر إنشاء البطاقة",
    invalidCardNumber: "رقم بطاقة غير صالح",
    enterSixDigits: "أدخل رقم بطاقتك المكوّن من 6 أرقام.",
    nameMinLength: "يجب أن يحتوي الاسم على حرفين على الأقل.",
    phoneRequired: "رقم الهاتف مطلوب.",
    email: "البريد الإلكتروني",
    emailPlaceholder: "vous@exemple.com",
    emailRequired: "البريد الإلكتروني مطلوب.",
    emailInvalid: "عنوان بريد إلكتروني غير صالح.",
    contactOwnerTitle: "تواصل مع مالك {shop}",
    contactOwnerDesc: "برنامج الولاء غير متاح مؤقتاً. يرجى التواصل مع المتجر مباشرة.",
    milestoneHint: "باقي {remaining} ختم(أختام) حتى: {label}",
    milestoneHintOne: "ختم واحد متبقٍ حتى: {label}",
    noRewardWaiting: "لا مكافأة في الانتظار",
    noRewardDesc: "ليس لديك جائزة للمطالبة بها الآن. استمر في جمع الأختام!",
    backToMyCard: "العودة لبطاقتي",
    myCard: "بطاقتي",
    yourPrize: "جائزتك",
    earnedOn: "حصلت عليها {date}",
    showStaffCode: "اعرض هذا الرمز للموظف",
    staffRedeemHint: "سيُعلّم الموظف المكافأة كمُستخدَمة عند استلام الجائزة.",
    backToLoyaltyCard: "العودة لبطاقة الولاء",
    myRewards: "مكافآتي",
    rewardPending: "للاستخدام",
    rewardRedeemed: "مُستخدَمة",
    tapToRedeem: "اضغط لعرض رمز QR",
    rewardEnjoy: "استمتع بمكافأتك!",
    rewardRedeemedDesc: "تم استلام هذه الجائزة. شكراً لولائك!",
    waitingForStaff: "في انتظار مسح الموظف…",
    rewardAlreadyRedeemed: "مُستخدَمة مسبقاً",
    rewardUpcoming: "ختم {position}",
  },
} as const;

export type ClientMessageKey = keyof typeof messages.en;

export function normalizeClientLanguage(value: unknown): ClientLanguage {
  if (value === "en") return "en";
  if (value === "ar") return "ar";
  return "fr";
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
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.classList.toggle("is-rtl", lang === "ar");
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

export function spendRewardHintText(
  currentSpendDzd: number,
  spendThresholdDzd: number,
  rewardValue: string | null | undefined,
  t: ReturnType<typeof clientT>,
): string | null {
  const remaining = Math.max(0, spendThresholdDzd - currentSpendDzd);
  if (remaining <= 0 || !rewardValue?.trim()) return null;
  const formatted = remaining.toLocaleString("fr-DZ");
  return t("spendRewardHint", { remaining: `${formatted} DZD`, label: rewardValue.trim() });
}
