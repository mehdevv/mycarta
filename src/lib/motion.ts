import type { Transition, Variants } from "framer-motion";

export const reducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const pageTransition: Transition = reducedMotion
  ? { duration: 0 }
  : { duration: 0.2, ease: "easeInOut" };

export const pageVariants: Variants = {
  initial: { opacity: reducedMotion ? 1 : 0 },
  animate: { opacity: 1 },
  exit: { opacity: reducedMotion ? 1 : 0 },
};

export const fadeUp: Variants = {
  initial: { opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: reducedMotion ? 0 : -8, transition: { duration: 0.2 } },
};

export const scaleIn: Variants = {
  initial: { opacity: reducedMotion ? 1 : 0, scale: reducedMotion ? 1 : 0.92 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 24 },
  },
};

export const celebrate: Variants = {
  initial: { opacity: 0, scale: 0.5 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: reducedMotion
      ? { duration: 0 }
      : { type: "spring", stiffness: 400, damping: 18 },
  },
};

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: reducedMotion ? 0 : 0.05, delayChildren: reducedMotion ? 0 : 0.08 },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
};

export const tabPanel: Variants = {
  initial: { opacity: reducedMotion ? 1 : 0, x: reducedMotion ? 0 : 12 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, x: reducedMotion ? 0 : -12, transition: { duration: 0.15 } },
};

export const scanResultSpring: Transition = reducedMotion
  ? { duration: 0 }
  : { type: "spring", stiffness: 280, damping: 22, duration: 0.4 };

export const scanResultVariants: Variants = {
  initial: { opacity: 0, scale: 0.85 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: scanResultSpring,
  },
};

export function vibrate(pattern: number | number[] = 50) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

export const cardReveal: Variants = {
  initial: { opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 24, scale: reducedMotion ? 1 : 0.96 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: reducedMotion
      ? { duration: 0 }
      : { type: "spring", stiffness: 260, damping: 26, mass: 0.9 },
  },
};

export const headerStagger: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: reducedMotion ? 0 : 0.07, delayChildren: reducedMotion ? 0 : 0.05 },
  },
};

export const headerItem: Variants = {
  initial: { opacity: reducedMotion ? 1 : 0, x: reducedMotion ? 0 : -10 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
};

export function tapScale(reduced = reducedMotion) {
  return reduced ? {} : { whileTap: { scale: 0.97 }, transition: { duration: 0.1 } };
}
