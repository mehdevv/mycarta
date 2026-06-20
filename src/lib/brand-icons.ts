import { CreditCard, LayoutDashboard, ScanLine, type LucideIcon } from "lucide-react";

export type BrandRole = "admin" | "employee" | "client";

export const BRAND_ROLE_META: Record<
  BrandRole,
  { icon: LucideIcon; label: string; fallbackAlt: string }
> = {
  admin: {
    icon: LayoutDashboard,
    label: "Admin",
    fallbackAlt: "Admin",
  },
  employee: {
    icon: ScanLine,
    label: "Staff",
    fallbackAlt: "Staff",
  },
  client: {
    icon: CreditCard,
    label: "Member",
    fallbackAlt: "Loyalty member",
  },
};
