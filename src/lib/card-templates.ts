export type StampStyleId =
  | "circle"
  | "square"
  | "rounded"
  | "hex"
  | "diamond"
  | "pill"
  | "ring"
  | "ticket"
  | "badge"
  | "bubble"
  | "outline"
  | "dot"
  | "neon"
  | "luxe"
  | "minimal"
  | "postage"
  | "bold"
  | "star"
  | "strip";

export type CardLayoutId =
  | "classic"
  | "compact"
  | "minimal"
  | "dark"
  | "glass"
  | "split"
  | "bold"
  | "ribbon"
  | "elegant"
  | "playful"
  | "retro"
  | "stacked"
  | "centered"
  | "frame"
  | "banner"
  | "soft"
  | "contrast"
  | "modern"
  | "inline"
  | "offset";

export type ProgressStyleId =
  | "bar"
  | "thin"
  | "thick"
  | "pill"
  | "gradient"
  | "segmented";

export type CardTemplate = {
  id: string;
  name: string;
  description: string;
  category: "classique" | "moderne" | "ludique" | "premium";
  stampStyle: StampStyleId;
  layout: CardLayoutId;
  progressStyle: ProgressStyleId;
  stampColumns: number;
  showMilestoneLabels: boolean;
  prestigeOnly?: boolean;
};

export const DEFAULT_CARD_DESIGN_ID = "classic";

export const CARD_TEMPLATES: CardTemplate[] = [
  {
    id: "classic",
    name: "Classique",
    description: "Tampons ronds, QR centré et panneau blanc — le standard fidélité.",
    category: "classique",
    stampStyle: "circle",
    layout: "classic",
    progressStyle: "bar",
    stampColumns: 5,
    showMilestoneLabels: true,
  },
  {
    id: "minimal-dots",
    name: "Points discrets",
    description: "Petits points compacts, barre fine et mise en page épurée.",
    category: "moderne",
    stampStyle: "dot",
    layout: "minimal",
    progressStyle: "thin",
    stampColumns: 5,
    showMilestoneLabels: false,
  },
  {
    id: "bold-squares",
    name: "Carrés affirmés",
    description: "Tampons carrés épais, progression large et titres marqués.",
    category: "moderne",
    stampStyle: "bold",
    layout: "bold",
    progressStyle: "thick",
    stampColumns: 5,
    showMilestoneLabels: true,
  },
  {
    id: "soft-round",
    name: "Douceur arrondie",
    description: "Coins très arrondis, ambiance douce et accueillante.",
    category: "ludique",
    stampStyle: "rounded",
    layout: "soft",
    progressStyle: "pill",
    stampColumns: 5,
    showMilestoneLabels: true,
  },
  {
    id: "hex-tech",
    name: "Hexagone tech",
    description: "Tampons hexagonaux pour une carte moderne et structurée.",
    category: "moderne",
    stampStyle: "hex",
    layout: "modern",
    progressStyle: "gradient",
    stampColumns: 5,
    showMilestoneLabels: true,
  },
  {
    id: "diamond-elegant",
    name: "Diamant élégant",
    description: "Formes en losange, cadre raffiné et détails soignés.",
    category: "premium",
    stampStyle: "diamond",
    layout: "elegant",
    progressStyle: "bar",
    stampColumns: 5,
    showMilestoneLabels: true,
    prestigeOnly: true,
  },
  {
    id: "pill-playful",
    name: "Pilules colorées",
    description: "Tampons en pilule, style fun et dynamique pour les jeunes marques.",
    category: "ludique",
    stampStyle: "pill",
    layout: "playful",
    progressStyle: "pill",
    stampColumns: 5,
    showMilestoneLabels: true,
  },
  {
    id: "ring-outline",
    name: "Anneaux contour",
    description: "Cercles vides jusqu'au remplissage — visuel léger et aéré.",
    category: "classique",
    stampStyle: "ring",
    layout: "centered",
    progressStyle: "thin",
    stampColumns: 5,
    showMilestoneLabels: false,
  },
  {
    id: "ticket-retro",
    name: "Ticket rétro",
    description: "Style ticket perforé, parfait pour cafés et boulangeries vintage.",
    category: "classique",
    stampStyle: "ticket",
    layout: "retro",
    progressStyle: "segmented",
    stampColumns: 5,
    showMilestoneLabels: true,
  },
  {
    id: "badge-pro",
    name: "Badge pro",
    description: "Tampons en forme de badge, idéal pour services et salons.",
    category: "premium",
    stampStyle: "badge",
    layout: "frame",
    progressStyle: "bar",
    stampColumns: 5,
    showMilestoneLabels: true,
  },
  {
    id: "bubble-pop",
    name: "Bulles pop",
    description: "Bulles ombrées et mise en page joyeuse pour commerces créatifs.",
    category: "ludique",
    stampStyle: "bubble",
    layout: "playful",
    progressStyle: "gradient",
    stampColumns: 5,
    showMilestoneLabels: true,
  },
  {
    id: "neon-night",
    name: "Néon nocturne",
    description: "Panneau sombre, tampons lumineux — impact visuel fort.",
    category: "moderne",
    stampStyle: "neon",
    layout: "dark",
    progressStyle: "gradient",
    stampColumns: 5,
    showMilestoneLabels: true,
    prestigeOnly: true,
  },
  {
    id: "luxe-gold",
    name: "Luxe doré",
    description: "Accents dorés et tampons premium pour marques haut de gamme.",
    category: "premium",
    stampStyle: "luxe",
    layout: "elegant",
    progressStyle: "gradient",
    stampColumns: 5,
    showMilestoneLabels: true,
    prestigeOnly: true,
  },
  {
    id: "postage-vintage",
    name: "Timbre vintage",
    description: "Effet timbre-poste dentelé, charme artisanal et authentique.",
    category: "classique",
    stampStyle: "postage",
    layout: "retro",
    progressStyle: "bar",
    stampColumns: 5,
    showMilestoneLabels: true,
  },
  {
    id: "compact-grid",
    name: "Grille compacte",
    description: "6 colonnes serrées pour cartes avec beaucoup de tampons.",
    category: "moderne",
    stampStyle: "minimal",
    layout: "compact",
    progressStyle: "thin",
    stampColumns: 6,
    showMilestoneLabels: false,
  },
  {
    id: "split-qr",
    name: "Split QR",
    description: "QR à gauche, détails à droite — lecture rapide au comptoir.",
    category: "moderne",
    stampStyle: "circle",
    layout: "split",
    progressStyle: "bar",
    stampColumns: 4,
    showMilestoneLabels: true,
  },
  {
    id: "glass-frost",
    name: "Verre givré",
    description: "Glassmorphism, flou et transparence pour un rendu contemporain.",
    category: "premium",
    stampStyle: "outline",
    layout: "glass",
    progressStyle: "pill",
    stampColumns: 5,
    showMilestoneLabels: true,
    prestigeOnly: true,
  },
  {
    id: "ribbon-banner",
    name: "Ruban bannière",
    description: "Bandeau de progression en ruban au-dessus des tampons.",
    category: "ludique",
    stampStyle: "rounded",
    layout: "ribbon",
    progressStyle: "thick",
    stampColumns: 5,
    showMilestoneLabels: true,
  },
  {
    id: "stacked-rows",
    name: "Rangées empilées",
    description: "Tampons en rangées larges, hiérarchie visuelle claire.",
    category: "classique",
    stampStyle: "square",
    layout: "stacked",
    progressStyle: "bar",
    stampColumns: 4,
    showMilestoneLabels: true,
  },
  {
    id: "star-special",
    name: "Étoile spéciale",
    description: "Tampons en étoile pour récompenses et événements festifs.",
    category: "ludique",
    stampStyle: "star",
    layout: "banner",
    progressStyle: "gradient",
    stampColumns: 5,
    showMilestoneLabels: true,
  },
];

const templateMap = new Map(CARD_TEMPLATES.map((t) => [t.id, t]));

export function getAvailableCardTemplates(options: {
  canBrowseTemplates: boolean;
  canUseExclusiveTemplates: boolean;
}): CardTemplate[] {
  if (!options.canBrowseTemplates) {
    return CARD_TEMPLATES.filter((t) => t.id === DEFAULT_CARD_DESIGN_ID);
  }
  if (!options.canUseExclusiveTemplates) {
    return CARD_TEMPLATES.filter((t) => !t.prestigeOnly);
  }
  return CARD_TEMPLATES;
}

export function getCardTemplate(id: string | null | undefined): CardTemplate {
  if (!id) return templateMap.get(DEFAULT_CARD_DESIGN_ID)!;
  return templateMap.get(id) ?? templateMap.get(DEFAULT_CARD_DESIGN_ID)!;
}

export function cardTemplateClassName(template: CardTemplate): string {
  return [
    "card-tpl",
    `card-tpl--layout-${template.layout}`,
    `card-tpl--progress-${template.progressStyle}`,
  ].join(" ");
}

export function stampGridClassName(template: CardTemplate): string {
  return `stamp-grid stamp-grid--${template.stampStyle}`;
}
