import { PLATFORM } from "@/lib/platform";

export type PlanId = "trial" | "boutique" | "maison" | "prestige";

export type PlanCapabilities = {
  aiCardBuilder: boolean;
  cardTemplates: boolean;
  exclusiveTemplates: boolean;
  customCardBg: boolean;
  whatsapp: boolean;
  apiAccess: boolean;
};

export interface PlanFeature {
  id: PlanId;
  name: string;
  emoji: string;
  monthlyDzd: number | null;
  annualDzd: number | null;
  annualSavingsDzd: number | null;
  clientLimit: number | null;
  workerLimit: number | null;
  campaignLimit: number | null;
  locationLimit: number | null;
  clientLimitLabel: string;
  workerLimitLabel: string;
  campaignLabel: string;
  locationLabel: string;
  cardDesign: string;
  support: string;
  supportResponse: string;
  description: string;
  capabilities: PlanCapabilities;
}

const boutiqueCaps: PlanCapabilities = {
  aiCardBuilder: false,
  cardTemplates: false,
  exclusiveTemplates: false,
  customCardBg: false,
  whatsapp: false,
  apiAccess: false,
};

const maisonCaps: PlanCapabilities = {
  aiCardBuilder: true,
  cardTemplates: true,
  exclusiveTemplates: false,
  customCardBg: true,
  whatsapp: true,
  apiAccess: false,
};

const prestigeCaps: PlanCapabilities = {
  aiCardBuilder: true,
  cardTemplates: true,
  exclusiveTemplates: true,
  customCardBg: true,
  whatsapp: true,
  apiAccess: true,
};

function limitLabel(value: number | null, unit = ""): string {
  if (value === null) return "Illimité";
  return `${value.toLocaleString("fr-DZ")}${unit}`;
}

export const PLANS: PlanFeature[] = [
  {
    id: "trial",
    name: "Essai gratuit",
    emoji: "✦",
    monthlyDzd: 0,
    annualDzd: 0,
    annualSavingsDzd: null,
    clientLimit: 250,
    workerLimit: 3,
    campaignLimit: 3,
    locationLimit: 1,
    clientLimitLabel: "250",
    workerLimitLabel: "3",
    campaignLabel: "3 / mois",
    locationLabel: "1",
    cardDesign: "Standard fixe",
    support: "Email",
    supportResponse: "72h ouvrées",
    description: `14 jours pour découvrir ${PLATFORM.name} — limites plan Boutique`,
    capabilities: { ...boutiqueCaps },
  },
  {
    id: "boutique",
    name: "Boutique",
    emoji: "🥉",
    monthlyDzd: 2900,
    annualDzd: 29000,
    annualSavingsDzd: 5800,
    clientLimit: 250,
    workerLimit: 3,
    campaignLimit: 3,
    locationLimit: 1,
    clientLimitLabel: "250",
    workerLimitLabel: "3",
    campaignLabel: "3 / mois",
    locationLabel: "1",
    cardDesign: "Standard fixe",
    support: "Email",
    supportResponse: "72h ouvrées",
    description: "Cafés, épiceries, boutiques de mode, salons de coiffure",
    capabilities: { ...boutiqueCaps },
  },
  {
    id: "maison",
    name: "Maison",
    emoji: "🥈",
    monthlyDzd: 5400,
    annualDzd: 54000,
    annualSavingsDzd: 10800,
    clientLimit: 2000,
    workerLimit: 15,
    campaignLimit: null,
    locationLimit: 3,
    clientLimitLabel: "2 000",
    workerLimitLabel: "15",
    campaignLabel: "Illimitées",
    locationLabel: "3",
    cardDesign: "AI Card Builder",
    support: "Email prioritaire",
    supportResponse: "24h ouvrées",
    description: "Restaurants, pharmacies, marques multi-produits",
    capabilities: { ...maisonCaps },
  },
  {
    id: "prestige",
    name: "Prestige",
    emoji: "🥇",
    monthlyDzd: null,
    annualDzd: null,
    annualSavingsDzd: null,
    clientLimit: null,
    workerLimit: null,
    campaignLimit: null,
    locationLimit: null,
    clientLimitLabel: "Illimité",
    workerLimitLabel: "Illimité",
    campaignLabel: "Illimitées",
    locationLabel: "Illimité",
    cardDesign: "AI Card Builder + templates exclusives",
    support: "Dédié (WhatsApp direct)",
    supportResponse: "< 4h",
    description: "Chaînes, marques nationales, franchises",
    capabilities: { ...prestigeCaps },
  },
];

export const ADDONS = [
  { name: "Extension clients (+250)", price: "900 DA/mois", plans: "Boutique / Maison" },
  { name: "Extension workers (+3)", price: "600 DA/mois", plans: "Boutique / Maison" },
  { name: "Extension campagnes (+5 / mois)", price: "500 DA/mois", plans: "Boutique" },
  { name: "Activation WhatsApp Business (setup + test)", price: "2 500 DA (unique)", plans: "Boutique" },
  { name: "Design carte fidélité personnalisée", price: "3 500 DA (unique)", plans: "Boutique" },
  { name: "Configuration initiale & onboarding guidé", price: "4 900 DA (unique)", plans: "Boutique / Maison" },
  { name: "Formation workers (session 1h visio)", price: "2 900 DA (unique)", plans: "Tous les plans" },
  { name: "Migration données CSV", price: "3 500 DA (unique)", plans: "Tous les plans" },
  { name: "Site additionnel", price: "1 500 DA/mois", plans: "Boutique / Maison" },
];

const planMap = new Map(PLANS.map((p) => [p.id, p]));

export function getPlan(planId: PlanId | string): PlanFeature {
  return planMap.get(planId as PlanId) ?? planMap.get("trial")!;
}

export function getPlanCapabilities(planId: PlanId | string): PlanCapabilities {
  return getPlan(planId).capabilities;
}

export function formatDzd(amount: number | null, customQuote = "Sur devis") {
  if (amount === null) return customQuote;
  return `${amount.toLocaleString("fr-DZ")} DA`;
}

export function formatPlanLimit(value: number | null): string {
  return limitLabel(value);
}

export const ANNUAL_BILLING_NOTE = "2 mois offerts (10 mois facturés)";
