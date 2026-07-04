import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Breakpoint = "sm" | "md" | "lg";

const BREAKPOINT_PX: Record<Breakpoint, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
};

const SNAP_THRESHOLD_PX = 4;
const AUTOPLAY_MS = 3000;
const AUTOPLAY_RESUME_MS = 6000;

function readIsCarousel(minWidth: Breakpoint) {
  if (typeof window === "undefined") return false;
  return window.innerWidth < BREAKPOINT_PX[minWidth];
}

function getSlideElements(track: HTMLElement) {
  return Array.from(track.querySelectorAll<HTMLElement>("[data-carousel-slide]"));
}

function nearestSlideIndex(track: HTMLElement, slides: HTMLElement[]) {
  if (!slides.length) return 0;

  const scrollLeft = track.scrollLeft;
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  slides.forEach((slide, i) => {
    const distance = Math.abs(slide.offsetLeft - scrollLeft);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  });

  return bestIndex;
}

type LandingMobileCarouselProps = {
  children: ReactNode;
  ariaLabel: string;
  desktopClassName: string;
  minWidth?: Breakpoint;
  showArrows?: boolean;
  showCounter?: boolean;
  autoPlay?: boolean;
  autoPlayIntervalMs?: number;
  className?: string;
};

export function LandingMobileCarousel({
  children,
  ariaLabel,
  desktopClassName,
  minWidth = "sm",
  showArrows = true,
  showCounter = true,
  autoPlay = true,
  autoPlayIntervalMs = AUTOPLAY_MS,
  className = "",
}: LandingMobileCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const snapLockRef = useRef(false);
  const activeRef = useRef(0);
  const autoplayPausedRef = useRef(false);
  const autoplayResumeTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const slides = Children.toArray(children);
  const count = slides.length;
  const [active, setActive] = useState(0);
  const [isCarousel, setIsCarousel] = useState(() => readIsCarousel(minWidth));

  activeRef.current = active;

  const pauseAutoplay = useCallback((resumeAfterMs = AUTOPLAY_RESUME_MS) => {
    autoplayPausedRef.current = true;
    clearTimeout(autoplayResumeTimerRef.current);
    autoplayResumeTimerRef.current = setTimeout(() => {
      autoplayPausedRef.current = false;
    }, resumeAfterMs);
  }, []);

  const scrollTo = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const track = trackRef.current;
    if (!track) return;

    const clamped = Math.max(0, Math.min(count - 1, index));
    const slideEls = getSlideElements(track);
    const slide = slideEls[clamped];
    if (!slide) return;

    const targetLeft = slide.offsetLeft;
    if (Math.abs(track.scrollLeft - targetLeft) <= SNAP_THRESHOLD_PX) {
      setActive(clamped);
      return;
    }

    snapLockRef.current = true;
    track.scrollTo({ left: targetLeft, behavior });
    setActive(clamped);
  }, [count]);

  const settleToNearestSlide = useCallback((behavior: ScrollBehavior = "smooth") => {
    const track = trackRef.current;
    if (!track || snapLockRef.current) return;

    const slideEls = getSlideElements(track);
    if (!slideEls.length) return;

    const nearest = nearestSlideIndex(track, slideEls);
    const targetLeft = slideEls[nearest].offsetLeft;

    setActive(nearest);

    if (Math.abs(track.scrollLeft - targetLeft) > SNAP_THRESHOLD_PX) {
      snapLockRef.current = true;
      track.scrollTo({ left: targetLeft, behavior });
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${BREAKPOINT_PX[minWidth]}px)`);
    const onChange = () => {
      const next = !mq.matches;
      setIsCarousel(next);
      if (next) {
        setActive(0);
        trackRef.current?.scrollTo({ left: 0, behavior: "auto" });
      }
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [minWidth]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !isCarousel) return;

    const supportsScrollEnd = "onscrollend" in window;
    let scrollEndTimer: ReturnType<typeof setTimeout> | undefined;

    const onScroll = () => {
      if (snapLockRef.current) return;
      pauseAutoplay();
      const slideEls = getSlideElements(track);
      setActive(nearestSlideIndex(track, slideEls));

      if (!supportsScrollEnd) {
        clearTimeout(scrollEndTimer);
        scrollEndTimer = setTimeout(() => {
          snapLockRef.current = false;
          settleToNearestSlide("smooth");
        }, 120);
      }
    };

    const onScrollEnd = () => {
      snapLockRef.current = false;
      settleToNearestSlide("smooth");
    };

    track.addEventListener("scroll", onScroll, { passive: true });
    if (supportsScrollEnd) {
      track.addEventListener("scrollend", onScrollEnd);
    }

    return () => {
      track.removeEventListener("scroll", onScroll);
      if (supportsScrollEnd) {
        track.removeEventListener("scrollend", onScrollEnd);
      }
      clearTimeout(scrollEndTimer);
    };
  }, [isCarousel, count, settleToNearestSlide, pauseAutoplay]);

  const goNextLoop = useCallback(() => {
    scrollTo((activeRef.current + 1) % count);
  }, [count, scrollTo]);

  useEffect(() => {
    if (!isCarousel || !autoPlay || count <= 1) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    const tick = () => {
      if (autoplayPausedRef.current || document.hidden) return;
      goNextLoop();
    };

    const interval = window.setInterval(tick, autoPlayIntervalMs);
    return () => window.clearInterval(interval);
  }, [isCarousel, autoPlay, autoPlayIntervalMs, count, goNextLoop]);

  useEffect(() => {
    return () => clearTimeout(autoplayResumeTimerRef.current);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !isCarousel || !autoPlay) return;

    const onUserScroll = () => pauseAutoplay();

    track.addEventListener("touchstart", onUserScroll, { passive: true });
    track.addEventListener("pointerdown", onUserScroll);

    return () => {
      track.removeEventListener("touchstart", onUserScroll);
      track.removeEventListener("pointerdown", onUserScroll);
    };
  }, [isCarousel, autoPlay, pauseAutoplay]);

  const goPrev = () => {
    pauseAutoplay();
    scrollTo(active - 1);
  };
  const goNext = () => {
    pauseAutoplay();
    scrollTo(active + 1);
  };
  const goTo = (index: number) => {
    pauseAutoplay();
    scrollTo(index);
  };

  return (
    <div className={`landing-carousel ${className}`.trim()}>
      <div className="landing-carousel-shell">
        <div
          ref={trackRef}
          className={`landing-carousel-track ${desktopClassName}`}
          data-carousel-mode={isCarousel ? "true" : "false"}
          role="region"
          aria-roledescription="carousel"
          aria-label={ariaLabel}
        >
          {slides.map((slide, i) => (
            <div
              key={i}
              data-carousel-slide
              className="landing-carousel-slide"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} sur ${count}`}
              aria-hidden={isCarousel && active !== i}
            >
              {slide}
            </div>
          ))}
        </div>
      </div>

      {isCarousel && (
        <div className="landing-carousel-controls">
          {showArrows && (
            <button
              type="button"
              className="landing-carousel-arrow"
              onClick={goPrev}
              disabled={active === 0}
              aria-label="Slide précédent"
            >
              <ChevronLeft size={18} strokeWidth={2.25} />
            </button>
          )}

          <div className="landing-carousel-dots" role="tablist" aria-label={`Navigation ${ariaLabel}`}>
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={active === i}
                aria-label={`Aller au slide ${i + 1}`}
                className={`landing-carousel-dot ${active === i ? "is-active" : ""}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>

          {showCounter && (
            <p className="landing-carousel-counter" aria-live="polite">
              <span className="landing-carousel-counter-num">{String(active + 1).padStart(2, "0")}</span>
              <span className="landing-carousel-counter-sep">/</span>
              <span>{String(count).padStart(2, "0")}</span>
            </p>
          )}

          {showArrows && (
            <button
              type="button"
              className="landing-carousel-arrow"
              onClick={goNext}
              disabled={active === count - 1}
              aria-label="Slide suivant"
            >
              <ChevronRight size={18} strokeWidth={2.25} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
