export type BrandRole = "admin" | "employee" | "client";

export const BRAND_ICONS: Record<
  BrandRole,
  { src: string; alt: string; label: string }
> = {
  admin: {
    src: "/admin-icon.png",
    alt: "Ice King admin mascot",
    label: "Admin",
  },
  employee: {
    src: "/employee-icon.png",
    alt: "Ice King employee mascot",
    label: "Staff",
  },
  client: {
    src: "/client-icon.png",
    alt: "Ice King loyalty mascot",
    label: "Member",
  },
};
