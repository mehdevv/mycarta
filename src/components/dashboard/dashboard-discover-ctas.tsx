import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  ChevronRight,
  CreditCard,
  Gift,
  Package,
  Plug,
  QrCode,
  Settings,
  ShieldAlert,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { staggerItem } from "@/lib/motion";
import { INTEGRATIONS_LOCKED } from "@/lib/integration-tutorials";

type CtaItem = {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: "brand" | "success" | "neutral";
  category: "fidelity" | "activity" | "team" | "account";
};

const CTAS: CtaItem[] = [
  {
    href: "/ccard",
    icon: WalletCards,
    title: "Carte fidélité",
    description: "Logo, tampons, récompenses et aperçu live.",
    accent: "brand",
    category: "fidelity",
  },
  {
    href: "/clients",
    icon: Users,
    title: "Clients",
    description: "Liste, export CSV et fiches détaillées.",
    accent: "success",
    category: "fidelity",
  },
  {
    href: "/rewards",
    icon: Gift,
    title: "Récompenses",
    description: "Récompenses en attente et réclamées.",
    accent: "brand",
    category: "fidelity",
  },
  {
    href: "/scans",
    icon: QrCode,
    title: "Journal des scans",
    description: "Historique des achats validés.",
    accent: "neutral",
    category: "activity",
  },
  {
    href: "/analytics",
    icon: BarChart3,
    title: "Analytics",
    description: "Tendances, ventes et classements.",
    accent: "brand",
    category: "activity",
  },
  {
    href: "/products",
    icon: Package,
    title: "Produits",
    description: "Catalogue pour le suivi des achats.",
    accent: "neutral",
    category: "activity",
  },
  {
    href: "/fraud",
    icon: ShieldAlert,
    title: "Fraude",
    description: "Scans bloqués et alertes suspectes.",
    accent: "neutral",
    category: "activity",
  },
  {
    href: "/workers",
    icon: Users,
    title: "Employés",
    description: "Comptes scanner et QR employé.",
    accent: "neutral",
    category: "team",
  },
  {
    href: "/integrations",
    icon: Plug,
    title: "Intégrations",
    description: "Guides vidéo et configuration WhatsApp / email.",
    accent: "brand",
    category: "account",
  },
  {
    href: "/billing",
    icon: CreditCard,
    title: "Facturation",
    description: "Forfait, paiements et abonnement.",
    accent: "brand",
    category: "account",
  },
  {
    href: "/settings",
    icon: Settings,
    title: "Paramètres",
    description: "Commerce et sécurité du compte.",
    accent: "neutral",
    category: "account",
  },
];

const CATEGORIES = [
  { id: "fidelity" as const, label: "Fidélité" },
  { id: "activity" as const, label: "Activité" },
  { id: "team" as const, label: "Équipe" },
  { id: "account" as const, label: "Compte" },
];

const visibleCtas = CTAS.filter((cta) => !(INTEGRATIONS_LOCKED && cta.href === "/integrations"));

const accentBg: Record<NonNullable<CtaItem["accent"]>, string> = {
  brand: "var(--dash-brand-soft)",
  success: "#def7ec",
  neutral: "var(--dash-bg-secondary)",
};

const accentColor: Record<NonNullable<CtaItem["accent"]>, string> = {
  brand: "var(--dash-brand)",
  success: "#057a55",
  neutral: "var(--dash-text-secondary)",
};

const panelMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
};

export default function DashboardDiscoverCtas() {
  const availableCategories = CATEGORIES.filter((cat) =>
    visibleCtas.some((cta) => cta.category === cat.id),
  );
  const [activeTab, setActiveTab] = useState(availableCategories[0]?.id ?? "fidelity");

  const activeItems = visibleCtas.filter((cta) => cta.category === activeTab);

  return (
    <motion.section variants={staggerItem} className="dash-explore">
      <div className="dash-section-head">
        <div>
          <h2 className="dash-section-title">Explorer le tableau de bord</h2>
          <p className="dash-section-desc">
            Accès rapide aux sections pour gérer votre programme de fidélité.
          </p>
        </div>
      </div>

      <div className="dash-explore-tabs-wrap">
        <div className="dash-explore-tabs" role="tablist" aria-label="Sections du tableau de bord">
          {availableCategories.map((cat) => {
            const isActive = activeTab === cat.id;
            const count = visibleCtas.filter((c) => c.category === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`dash-explore-tab ${isActive ? "is-active" : ""}`}
                onClick={() => setActiveTab(cat.id)}
              >
                <span>{cat.label}</span>
                <span className="dash-explore-tab-count" aria-hidden>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          className="dash-cta-grid dash-cta-grid--tabbed"
          role="tabpanel"
          {...panelMotion}
        >
          {activeItems.map((cta) => {
            const Icon = cta.icon;
            const accent = cta.accent ?? "neutral";
            return (
              <Link key={cta.href} href={cta.href} className="dash-cta-card no-underline">
                <div
                  className="dash-cta-icon"
                  style={{ background: accentBg[accent], color: accentColor[accent] }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="dash-cta-title">{cta.title}</p>
                  <p className="dash-cta-desc">{cta.description}</p>
                </div>
                <ChevronRight className="dash-cta-arrow h-5 w-5 shrink-0" />
              </Link>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </motion.section>
  );
}
