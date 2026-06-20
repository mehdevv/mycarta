import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { staggerItem } from "@/lib/motion";

type Accent = "brand" | "success" | "neutral" | "danger";

const accentStyles: Record<Accent, { bg: string; color: string }> = {
  brand: { bg: "var(--dash-brand-soft)", color: "var(--dash-brand)" },
  success: { bg: "#d1fae5", color: "#0e9f6e" },
  neutral: { bg: "var(--dash-bg-secondary)", color: "var(--dash-text-secondary)" },
  danger: { bg: "#fde8e8", color: "#e02424" },
};

type DashboardStatCardProps = {
  label: string;
  value: string | number;
  meta?: string;
  icon: LucideIcon;
  accent?: Accent;
};

export function DashboardStatCard({ label, value, meta, icon: Icon, accent = "brand" }: DashboardStatCardProps) {
  const style = accentStyles[accent];

  return (
    <motion.article className="dash-stat" variants={staggerItem} whileHover={{ y: -2 }}>
      <div className="dash-stat-top">
        <span className="dash-stat-label">{label}</span>
        <span className="dash-stat-icon" style={{ background: style.bg, color: style.color }} aria-hidden>
          <Icon size={18} strokeWidth={2} />
        </span>
      </div>
      <p className="dash-stat-value">{typeof value === "number" ? value.toLocaleString() : value}</p>
      {meta && <p className="dash-stat-meta">{meta}</p>}
    </motion.article>
  );
}
