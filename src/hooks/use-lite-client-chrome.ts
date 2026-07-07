import { useEffect, useState } from "react";
import { reducedMotion } from "@/lib/motion";

/** Lighter client chrome on low-end devices or when reduced motion is preferred. */
export function useLiteClientChrome(): boolean {
  const [lite, setLite] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      setLite(true);
      return;
    }

    const cores = navigator.hardwareConcurrency ?? 8;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    setLite(cores <= 4 || (memory != null && memory <= 4));
  }, []);

  return lite;
}
