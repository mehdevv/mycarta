import { useEffect, useRef, useState } from "react";

export function useInView<T extends Element>(
  options?: IntersectionObserverInit & { triggerOnce?: boolean },
) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  const triggerOnce = options?.triggerOnce ?? true;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (triggerOnce) obs.disconnect();
        } else if (!triggerOnce) {
          setInView(false);
        }
      },
      { threshold: 0.25, ...options },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [options, triggerOnce]);

  return { ref, inView };
}
