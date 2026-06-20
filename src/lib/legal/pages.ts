import type { Locale } from "@/lib/i18n/types";
import type { LegalSlug } from "@/components/landing/nav-links";
import { PLATFORM } from "@/lib/platform";

export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export type LegalPageContent = {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
};

const company = PLATFORM.name;
const email = PLATFORM.supportEmail;

const fr: Record<LegalSlug, LegalPageContent> = {
  "mentions-legales": {
    title: "Mentions légales",
    updated: "Dernière mise à jour : 20 juin 2026",
    intro: `Informations légales relatives au site et au service ${company}.`,
    sections: [
      {
        heading: "Éditeur du service",
        paragraphs: [
          `Le service ${company} est une plateforme SaaS de cartes de fidélité digitales destinée aux commerces.`,
          `Pour toute question : ${email}`,
        ],
      },
      {
        heading: "Hébergement",
        paragraphs: [
          "L'application et les données sont hébergées auprès de prestataires cloud conformes aux standards de sécurité du secteur.",
          "Les sauvegardes et la surveillance sont assurées de manière continue.",
        ],
      },
      {
        heading: "Propriété intellectuelle",
        paragraphs: [
          `L'ensemble des éléments du site (textes, graphismes, logo, logiciel) est protégé. Toute reproduction non autorisée est interdite.`,
          `Les marques et contenus des commerces clients restent leur propriété.`,
        ],
      },
      {
        heading: "Responsabilité",
        paragraphs: [
          `${company} met en œuvre les moyens raisonnables pour assurer la disponibilité du service.`,
          "Le commerce reste responsable de son programme fidélité, de ses offres et du traitement de ses clients.",
        ],
      },
    ],
  },
  confidentialite: {
    title: "Politique de confidentialité",
    updated: "Dernière mise à jour : 20 juin 2026",
    intro: `Cette politique décrit comment ${company} traite les données personnelles des utilisateurs du site et des services.`,
    sections: [
      {
        heading: "Données collectées",
        paragraphs: [
          "Nous collectons les données nécessaires au fonctionnement du service : identité du commerçant, coordonnées, données de connexion, et — pour les programmes fidélité — informations des clients finaux (nom, téléphone, historique de scans) saisies par le commerce.",
        ],
      },
      {
        heading: "Finalités",
        paragraphs: [
          "Fourniture du service, facturation, support, sécurité, amélioration produit et respect des obligations légales.",
          "Les commerces déterminent la finalité vis-à-vis de leurs clients finaux dans le cadre de leur programme fidélité.",
        ],
      },
      {
        heading: "Conservation",
        paragraphs: [
          "Les données sont conservées pendant la durée du compte et selon les obligations légales applicables.",
          "À la résiliation, les données peuvent être exportées puis supprimées selon les procédures décrites dans votre tableau de bord.",
        ],
      },
      {
        heading: "Vos droits",
        paragraphs: [
          "Vous pouvez demander l'accès, la rectification, la suppression ou la limitation du traitement en contactant notre équipe.",
          `Contact : ${email}`,
        ],
      },
    ],
  },
  rgpd: {
    title: "RGPD & protection des données",
    updated: "Dernière mise à jour : 20 juin 2026",
    intro: `${company} aide les commerces à respecter leurs obligations en matière de protection des données personnelles.`,
    sections: [
      {
        heading: "Rôles",
        paragraphs: [
          "Pour les données des commerçants (compte, facturation), " + company + " agit en tant que responsable de traitement.",
          "Pour les données des clients finaux collectées via les cartes fidélité, le commerce est responsable de traitement et " + company + " agit en tant que sous-traitant.",
        ],
      },
      {
        heading: "Mesures techniques",
        paragraphs: [
          "Chiffrement en transit et au repos, isolation multi-tenant, contrôle d'accès, journalisation et sauvegardes.",
          "Chaque commerce dispose d'un espace isolé : vos données ne sont pas mélangées avec celles d'autres commerces.",
        ],
      },
      {
        heading: "Droits des personnes",
        paragraphs: [
          "Les personnes concernées peuvent exercer leurs droits auprès du commerce qui collecte leurs données.",
          "Le commerce peut exporter ou supprimer les données clients depuis son tableau de bord, conformément à sa politique.",
        ],
      },
      {
        heading: "Sous-traitants",
        paragraphs: [
          "Nous faisons appel à des prestataires d'hébergement, de paiement et d'emailing sélectionnés pour leur conformité et leur sécurité.",
          `Liste détaillée disponible sur demande : ${email}`,
        ],
      },
    ],
  },
  cookies: {
    title: "Politique cookies",
    updated: "Dernière mise à jour : 20 juin 2026",
    intro: "Cette page explique l'utilisation des cookies et technologies similaires sur notre site.",
    sections: [
      {
        heading: "Cookies essentiels",
        paragraphs: [
          "Nécessaires au fonctionnement du site : session, authentification, préférences de langue et sécurité.",
          "Ils ne peuvent pas être désactivés sans impacter le service.",
        ],
      },
      {
        heading: "Cookies de mesure",
        paragraphs: [
          "Nous pouvons utiliser des outils d'analyse agrégée pour comprendre l'usage du produit et améliorer l'expérience.",
          "Aucune donnée nominative n'est revendue à des tiers.",
        ],
      },
      {
        heading: "Gestion",
        paragraphs: [
          "Vous pouvez configurer votre navigateur pour refuser les cookies non essentiels.",
          "La suppression des cookies peut nécessiter une nouvelle connexion.",
        ],
      },
    ],
  },
  conditions: {
    title: "Conditions d'utilisation",
    updated: "Dernière mise à jour : 20 juin 2026",
    intro: `En utilisant ${company}, vous acceptez les présentes conditions.`,
    sections: [
      {
        heading: "Service",
        paragraphs: [
          `${company} fournit une plateforme de cartes fidélité digitales, CRM, analytics et outils associés pour les commerces.`,
          "Les fonctionnalités disponibles dépendent du plan souscrit.",
        ],
      },
      {
        heading: "Compte commerce",
        paragraphs: [
          "Vous êtes responsable de la confidentialité de vos identifiants et de l'activité réalisée sur votre compte.",
          "Les informations fournies à l'inscription doivent être exactes et à jour.",
        ],
      },
      {
        heading: "Essai et facturation",
        paragraphs: [
          "Un essai gratuit peut être proposé sans carte bancaire, dans les limites du plan d'essai.",
          "Les abonnements payants sont facturés selon la grille tarifaire en vigueur. Le non-paiement peut entraîner la suspension du service.",
        ],
      },
      {
        heading: "Usage acceptable",
        paragraphs: [
          "Interdiction d'utiliser le service à des fins illégales, frauduleuses ou portant atteinte aux droits des clients.",
          "Nous nous réservons le droit de suspendre un compte en cas de violation grave.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [`Pour toute question : ${email}`],
      },
    ],
  },
};

const en: Record<LegalSlug, LegalPageContent> = {
  "mentions-legales": {
    title: "Legal notice",
    updated: "Last updated: June 20, 2026",
    intro: `Legal information about the ${company} website and service.`,
    sections: [
      {
        heading: "Publisher",
        paragraphs: [
          `${company} is a SaaS platform for digital loyalty cards for businesses.`,
          `Questions: ${email}`,
        ],
      },
      {
        heading: "Hosting",
        paragraphs: [
          "The application and data are hosted with cloud providers meeting industry security standards.",
          "Backups and monitoring are performed continuously.",
        ],
      },
      {
        heading: "Intellectual property",
        paragraphs: [
          "All site elements (text, graphics, logo, software) are protected. Unauthorized reproduction is prohibited.",
          "Merchant brands and content remain their property.",
        ],
      },
      {
        heading: "Liability",
        paragraphs: [
          `${company} uses reasonable means to ensure service availability.`,
          "Merchants remain responsible for their loyalty program, offers, and customer handling.",
        ],
      },
    ],
  },
  confidentialite: {
    title: "Privacy policy",
    updated: "Last updated: June 20, 2026",
    intro: `This policy describes how ${company} processes personal data of website and service users.`,
    sections: [
      {
        heading: "Data collected",
        paragraphs: [
          "We collect data required to operate the service: merchant identity, contact details, login data, and — for loyalty programs — end-customer information (name, phone, scan history) entered by the merchant.",
        ],
      },
      {
        heading: "Purposes",
        paragraphs: [
          "Service delivery, billing, support, security, product improvement, and legal compliance.",
          "Merchants define the purpose regarding their end customers within their loyalty program.",
        ],
      },
      {
        heading: "Retention",
        paragraphs: [
          "Data is kept for the account lifetime and as required by applicable law.",
          "On termination, data may be exported then deleted per dashboard procedures.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "You may request access, rectification, deletion, or restriction by contacting our team.",
          `Contact: ${email}`,
        ],
      },
    ],
  },
  rgpd: {
    title: "GDPR & data protection",
    updated: "Last updated: June 20, 2026",
    intro: `${company} helps merchants meet their personal data protection obligations.`,
    sections: [
      {
        heading: "Roles",
        paragraphs: [
          `For merchant account data, ${company} is the data controller.`,
          `For end-customer data collected via loyalty cards, the merchant is the controller and ${company} is the processor.`,
        ],
      },
      {
        heading: "Technical measures",
        paragraphs: [
          "Encryption in transit and at rest, multi-tenant isolation, access control, logging, and backups.",
          "Each merchant has an isolated space — your data is never mixed with other merchants.",
        ],
      },
      {
        heading: "Data subject rights",
        paragraphs: [
          "Individuals may exercise their rights with the merchant that collected their data.",
          "Merchants can export or delete customer data from their dashboard.",
        ],
      },
      {
        heading: "Sub-processors",
        paragraphs: [
          "We use hosting, payment, and email providers selected for security and compliance.",
          `Detailed list available on request: ${email}`,
        ],
      },
    ],
  },
  cookies: {
    title: "Cookie policy",
    updated: "Last updated: June 20, 2026",
    intro: "This page explains how we use cookies and similar technologies.",
    sections: [
      {
        heading: "Essential cookies",
        paragraphs: [
          "Required for the site to work: session, authentication, language preference, and security.",
          "They cannot be disabled without affecting the service.",
        ],
      },
      {
        heading: "Analytics cookies",
        paragraphs: [
          "We may use aggregated analytics to understand product usage and improve the experience.",
          "No personal data is sold to third parties.",
        ],
      },
      {
        heading: "Managing cookies",
        paragraphs: [
          "You can configure your browser to refuse non-essential cookies.",
          "Deleting cookies may require signing in again.",
        ],
      },
    ],
  },
  conditions: {
    title: "Terms of service",
    updated: "Last updated: June 20, 2026",
    intro: `By using ${company}, you agree to these terms.`,
    sections: [
      {
        heading: "Service",
        paragraphs: [
          `${company} provides a digital loyalty card platform, CRM, analytics, and related tools for merchants.`,
          "Available features depend on your subscribed plan.",
        ],
      },
      {
        heading: "Merchant account",
        paragraphs: [
          "You are responsible for keeping credentials secure and for activity on your account.",
          "Registration information must be accurate and kept up to date.",
        ],
      },
      {
        heading: "Trial and billing",
        paragraphs: [
          "A free trial may be offered without a credit card, within trial plan limits.",
          "Paid subscriptions are billed per the current pricing. Non-payment may result in suspension.",
        ],
      },
      {
        heading: "Acceptable use",
        paragraphs: [
          "You may not use the service for illegal, fraudulent purposes or to harm customer rights.",
          "We may suspend accounts for serious violations.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [`Questions: ${email}`],
      },
    ],
  },
};

const ar: Record<LegalSlug, LegalPageContent> = {
  "mentions-legales": {
    title: "إشعار قانوني",
    updated: "آخر تحديث: 20 يونيو 2026",
    intro: `معلومات قانونية حول موقع وخدمة ${company}.`,
    sections: [
      {
        heading: "ناشر الخدمة",
        paragraphs: [
          `${company} منصة SaaS لبطاقات الولاء الرقمية للمتاجر.`,
          `للاستفسارات: ${email}`,
        ],
      },
      {
        heading: "الاستضافة",
        paragraphs: [
          "يتم استضافة التطبيق والبيانات لدى مزودي سحابة يلتزمون بمعايير أمان القطاع.",
          "النسخ الاحتياطي والمراقبة مستمران.",
        ],
      },
      {
        heading: "الملكية الفكرية",
        paragraphs: [
          "جميع عناصر الموقع محمية. يُمنع النسخ غير المصرّح به.",
          "علامات المتاجر ومحتواها تبقى ملكاً لأصحابها.",
        ],
      },
      {
        heading: "المسؤولية",
        paragraphs: [
          `${company} تبذل جهوداً معقولة لضمان توفر الخدمة.`,
          "المتجر مسؤول عن برنامج الولاء وعروضه وعلاقته بعملائه.",
        ],
      },
    ],
  },
  confidentialite: {
    title: "سياسة الخصوصية",
    updated: "آخر تحديث: 20 يونيو 2026",
    intro: `توضح هذه السياسة كيفية معالجة ${company} للبيانات الشخصية.`,
    sections: [
      {
        heading: "البيانات المجمّعة",
        paragraphs: [
          "نجمع البيانات اللازمة لتشغيل الخدمة: هوية التاجر، بيانات الاتصال، تسجيل الدخول، وبيانات عملاء الولاء (الاسم، الهاتف، سجل المسح) التي يدخلها المتجر.",
        ],
      },
      {
        heading: "الأغراض",
        paragraphs: [
          "تقديم الخدمة، الفوترة، الدعم، الأمان، تحسين المنتج، والامتثال القانوني.",
          "يحدد المتجر الغرض تجاه عملائه في إطار برنامج الولاء.",
        ],
      },
      {
        heading: "الاحتفاظ",
        paragraphs: [
          "تُحفظ البيانات طوال مدة الحساب وفقاً للقانون المعمول به.",
          "عند الإنهاء، يمكن تصدير البيانات ثم حذفها من لوحة التحكم.",
        ],
      },
      {
        heading: "حقوقك",
        paragraphs: [
          "يمكنك طلب الوصول أو التصحيح أو الحذف أو التقييد بالتواصل معنا.",
          `الاتصال: ${email}`,
        ],
      },
    ],
  },
  rgpd: {
    title: "GDPR وحماية البيانات",
    updated: "آخر تحديث: 20 يونيو 2026",
    intro: `${company} تساعد المتاجر على الوفاء بالتزامات حماية البيانات.`,
    sections: [
      {
        heading: "الأدوار",
        paragraphs: [
          `لبيانات حساب التاجر، ${company} هي المتحكم في المعالجة.`,
          `لبيانات العملاء عبر بطاقات الولاء، المتجر هو المتحكم و${company} معالج البيانات.`,
        ],
      },
      {
        heading: "التدابير التقنية",
        paragraphs: [
          "تشفير في النقل والراحة، عزل متعدد المستأجرين، تحكم بالوصول، سجلات، ونسخ احتياطي.",
          "كل متجر معزول — بياناتك لا تختلط مع متاجر أخرى.",
        ],
      },
      {
        heading: "حقوق الأشخاص",
        paragraphs: [
          "يمكن للأشخاص ممارسة حقوقهم لدى المتجر الذي جمع بياناتهم.",
          "يمكن للمتجر تصدير أو حذف بيانات العملاء من لوحة التحكم.",
        ],
      },
      {
        heading: "المعالجون الفرعيون",
        paragraphs: [
          "نستخدم مزودي استضافة ودفع وبريد مختارين للأمان والامتثال.",
          `القائمة التفصيلية عند الطلب: ${email}`,
        ],
      },
    ],
  },
  cookies: {
    title: "سياسة ملفات تعريف الارتباط",
    updated: "آخر تحديث: 20 يونيو 2026",
    intro: "توضح هذه الصفحة استخدامنا لملفات تعريف الارتباط والتقنيات المماثلة.",
    sections: [
      {
        heading: "ملفات أساسية",
        paragraphs: [
          "ضرورية لعمل الموقع: الجلسة، المصادقة، تفضيل اللغة، والأمان.",
          "لا يمكن تعطيلها دون التأثير على الخدمة.",
        ],
      },
      {
        heading: "ملفات التحليل",
        paragraphs: [
          "قد نستخدم تحليلات مجمّعة لفهم الاستخدام وتحسين التجربة.",
          "لا يتم بيع بيانات شخصية لأطراف ثالثة.",
        ],
      },
      {
        heading: "الإدارة",
        paragraphs: [
          "يمكنك ضبط المتصفح لرفض الملفات غير الأساسية.",
          "حذف الملفات قد يتطلب تسجيل دخول جديد.",
        ],
      },
    ],
  },
  conditions: {
    title: "شروط الاستخدام",
    updated: "آخر تحديث: 20 يونيو 2026",
    intro: `باستخدام ${company}، أنت توافق على هذه الشروط.`,
    sections: [
      {
        heading: "الخدمة",
        paragraphs: [
          `${company} توفر منصة بطاقات ولاء رقمية وCRM وتحليلات للمتاجر.`,
          "الميزات المتاحة تعتمد على الخطة المشترك بها.",
        ],
      },
      {
        heading: "حساب المتجر",
        paragraphs: [
          "أنت مسؤول عن سرية بيانات الدخول والنشاط على حسابك.",
          "يجب أن تكون معلومات التسجيل دقيقة ومحدّثة.",
        ],
      },
      {
        heading: "التجربة والفوترة",
        paragraphs: [
          "قد تُعرض تجربة مجانية بدون بطاقة بنكية ضمن حدود الخطة.",
          "الاشتراكات المدفوعة تُفوتر حسب الأسعار السارية. قد يؤدي عدم الدفع إلى التعليق.",
        ],
      },
      {
        heading: "الاستخدام المقبول",
        paragraphs: [
          "يُمنع استخدام الخدمة لأغراض غير قانونية أو احتيالية أو الإضرار بحقوق العملاء.",
          "قد نعلق الحسابات عند مخالفة جسيمة.",
        ],
      },
      {
        heading: "الاتصال",
        paragraphs: [`للاستفسارات: ${email}`],
      },
    ],
  },
};

const byLocale: Record<Locale, Record<LegalSlug, LegalPageContent>> = { fr, en, ar };

export function getLegalPage(slug: string, locale: Locale): LegalPageContent | null {
  if (!(slug in fr)) return null;
  return byLocale[locale][slug as LegalSlug] ?? byLocale.fr[slug as LegalSlug];
}

export function isLegalSlug(slug: string): slug is LegalSlug {
  return slug in fr;
}
