import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const PLAT_CHART_TOOLTIP = {
  background: "#1c2424",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: 12,
  color: "#f2f2f0",
};

type BtnVariant = "primary" | "secondary" | "success" | "danger" | "warning";

export function PlatformButton({
  variant = "primary",
  size,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: "sm";
}) {
  return (
    <button
      type="button"
      className={cn(
        "plat-btn",
        `plat-btn--${variant}`,
        size === "sm" && "plat-btn--sm",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function PlatformBanner({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("plat-banner plat-banner--warning", className)}>{children}</div>;
}

export function PlatformTabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string }[];
}) {
  return (
    <div className="plat-tabs" role="tablist">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          className={cn("plat-tab", value === item.value && "is-active")}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function PlatformSkeleton({ className }: { className?: string }) {
  return <div className={cn("plat-skeleton", className)} />;
}

const accentIconClass: Record<string, string> = {
  primary: "plat-stat-icon--accent",
  secondary: "plat-stat-icon--success",
  amber: "plat-stat-icon--warning",
  destructive: "plat-stat-icon--danger",
};

export function PlatformKpi({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = "primary",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  accent?: "primary" | "secondary" | "amber" | "destructive";
}) {
  return (
    <article className="plat-stat">
      <div className="plat-stat-top">
        <span className="plat-stat-label">{title}</span>
        <span className={`plat-stat-icon ${accentIconClass[accent]}`} aria-hidden>
          <Icon size={18} strokeWidth={2} />
        </span>
      </div>
      <p className="plat-stat-value">{typeof value === "number" ? value.toLocaleString("fr-DZ") : value}</p>
      {subtitle && <p className="plat-stat-meta">{subtitle}</p>}
    </article>
  );
}

export function PlatformKpiSkeleton() {
  return (
    <div className="plat-stat">
      <div className="plat-skeleton h-4 w-24 mb-3" />
      <div className="plat-skeleton h-8 w-16" />
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    trialing: "Essai",
    active: "Actif",
    past_due: "En retard",
    expired: "Expiré",
    canceled: "Annulé",
    pending: "En attente",
    approved: "Approuvé",
    rejected: "Rejeté",
    failed: "Échoué",
  };

  const safe = status.replace(/[^a-z_]/gi, "");
  return (
    <span className={`plat-badge plat-badge--${safe in labels ? safe : "canceled"}`}>
      {labels[status] ?? status}
    </span>
  );
}

export function PlatformPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="plat-page-header">
      <div>
        {eyebrow && <p className="plat-page-eyebrow">{eyebrow}</p>}
        <h1 className="plat-page-title">{title}</h1>
        {description && <div className="plat-page-desc">{description}</div>}
      </div>
      {action && <div className="plat-toolbar">{action}</div>}
    </header>
  );
}

export function PlatformCard({
  children,
  className = "",
  flush = false,
}: {
  children: React.ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <article className={`plat-card ${className}`.trim()}>
      {children}
    </article>
  );
}

export function PlatformCardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="plat-card-header flex flex-row items-start justify-between gap-3">
      <div>
        <h2 className="plat-card-title">{title}</h2>
        {description && <p className="plat-card-desc">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PlatformCardBody({
  children,
  flush = false,
  className = "",
}: {
  children: React.ReactNode;
  flush?: boolean;
  className?: string;
}) {
  return (
    <div className={`plat-card-body ${flush ? "plat-card-body--flush" : ""} ${className}`.trim()}>
      {children}
    </div>
  );
}
