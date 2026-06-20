import { motion } from "framer-motion";
import { BRAND_ROLE_META, type BrandRole } from "@/lib/brand-icons";
import { PLATFORM } from "@/lib/platform";

const sizeClasses = {
  xs: "h-10 w-10",
  sm: "h-14 w-14",
  md: "h-20 w-20",
  lg: "h-28 w-28",
  xl: "h-36 w-36",
} as const;

// Logo image keeps its natural aspect ratio (the brand mark is horizontal),
// so we constrain height and let width scale rather than cropping to a square.
const logoHeightClasses = {
  xs: "h-8",
  sm: "h-10",
  md: "h-12",
  lg: "h-16",
  xl: "h-20",
} as const;

const iconSizes = {
  xs: 18,
  sm: 22,
  md: 28,
  lg: 36,
  xl: 44,
} as const;

export type BrandLogoProps = {
  role?: BrandRole;
  logoUrl?: string | null;
  alt?: string;
  primaryColor?: string;
  size?: keyof typeof sizeClasses;
  className?: string;
  animate?: boolean;
  float?: boolean;
};

export default function BrandLogo({
  role = "admin",
  logoUrl,
  alt,
  primaryColor = PLATFORM.primaryColor,
  size = "md",
  className = "",
  animate = true,
  float = false,
}: BrandLogoProps) {
  const resolvedLogo = logoUrl ?? (role === "client" ? null : PLATFORM.logoUrl);
  const meta = BRAND_ROLE_META[role];
  const Icon = meta.icon;
  const label = alt || meta.fallbackAlt;

  const content = resolvedLogo ? (
    <img
      src={resolvedLogo}
      alt={label}
      className={`${logoHeightClasses[size]} w-auto max-w-[180px] rounded-lg object-contain select-none`}
      draggable={false}
    />
  ) : (
    <div
      className={`${sizeClasses[size]} rounded-xl flex items-center justify-center shadow-sm select-none`}
      style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
      aria-hidden={!alt}
    >
      <Icon size={iconSizes[size]} strokeWidth={2} />
    </div>
  );

  if (!animate) {
    return <div className={`inline-flex ${className}`}>{content}</div>;
  }

  return (
    <motion.div
      className={`inline-flex ${className}`}
      initial={{ scale: 0.88, opacity: 0, y: 10 }}
      animate={{
        scale: 1,
        opacity: 1,
        y: float ? [0, -6, 0] : 0,
      }}
      transition={{
        scale: { type: "spring", stiffness: 280, damping: 22 },
        opacity: { duration: 0.35 },
        y: float ? { duration: 4, repeat: Infinity, ease: "easeInOut" } : undefined,
      }}
      whileHover={{ scale: 1.04 }}
    >
      {content}
    </motion.div>
  );
}
