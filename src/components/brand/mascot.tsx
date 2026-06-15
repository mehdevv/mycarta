import { motion } from "framer-motion";
import { BRAND_ICONS, type BrandRole } from "@/lib/brand-icons";

const sizeClasses = {
  xs: "h-10 w-10",
  sm: "h-14 w-14",
  md: "h-20 w-20",
  lg: "h-28 w-28",
  xl: "h-36 w-36",
} as const;

type MascotProps = {
  role: BrandRole;
  size?: keyof typeof sizeClasses;
  className?: string;
  animate?: boolean;
  float?: boolean;
};

export default function Mascot({
  role,
  size = "md",
  className = "",
  animate = true,
  float = false,
}: MascotProps) {
  const { src, alt } = BRAND_ICONS[role];
  const image = (
    <img
      src={src}
      alt={alt}
      className={`${sizeClasses[size]} object-contain drop-shadow-md select-none`}
      draggable={false}
    />
  );

  if (!animate) {
    return <div className={`inline-flex ${className}`}>{image}</div>;
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
      whileHover={{ scale: 1.04, rotate: role === "employee" ? 2 : -2 }}
    >
      {image}
    </motion.div>
  );
}
