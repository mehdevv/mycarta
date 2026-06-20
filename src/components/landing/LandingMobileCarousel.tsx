import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Breakpoint = "sm" | "md" | "lg";

const BREAKPOINT_PX: Record<Breakpoint, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
};

function readIsCarousel(minWidth: Breakpoint) {
  if (typeof window === "undefined") return false;
  return window.innerWidth < BREAKPOINT_PX[minWidth];
}

type LandingMobileCarouselProps = {
  children: ReactNode;
  ariaLabel: string;
  desktopClassName: string;
  minWidth?: Breakpoint;
  showArrows?: boolean;
  showCounter?: boolean;
  className?: string;
};

export function LandingMobileCarousel({
  children,
  ariaLabel,
  desktopClassName,
  minWidth = "sm",
  showArrows = true,
  showCounter = true,
  className = "",
}: LandingMobileCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false });
  const slides = Children.toArray(children);
  const count = slides.length;
  const [active, setActive] = useState(0);
  const [isCarousel, setIsCarousel] = useState(() => readIsCarousel(minWidth));

  const syncActiveFromScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const slidesEls = Array.from(track.querySelectorAll<HTMLElement>("[data-carousel-slide]"));
    if (!slidesEls.length) return;

    const center = track.scrollLeft + track.clientWidth / 2;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    slidesEls.forEach((slide, i) => {
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
      const distance = Math.abs(slideCenter - center);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    });

    setActive((prev) => (prev === bestIndex ? prev : bestIndex));
  }, []);

  const scrollTo = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const track = trackRef.current;
    if (!track) return;

    const clamped = Math.max(0, Math.min(count - 1, index));
    const slide = track.querySelectorAll<HTMLElement>("[data-carousel-slide]")[clamped];
    if (!slide) return;

    track.scrollTo({
      left: slide.offsetLeft - (track.clientWidth - slide.clientWidth) / 2,
      behavior,
    });
    setActive(clamped);
  }, [count]);

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

    const slidesEls = Array.from(track.querySelectorAll<HTMLElement>("[data-carousel-slide]"));
    if (!slidesEls.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let bestIndex = -1;
        let bestRatio = 0;

        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const ratio = entry.intersectionRatio;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestIndex = slidesEls.indexOf(entry.target as HTMLElement);
          }
        });

        if (bestIndex >= 0) {
          setActive((prev) => (prev === bestIndex ? prev : bestIndex));
        }
      },
      {
        root: track,
        threshold: [0.55, 0.7, 0.85],
      },
    );

    slidesEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isCarousel, count]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !isCarousel) return;

    const onScroll = () => syncActiveFromScroll();
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, [isCarousel, count, syncActiveFromScroll]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isCarousel) return;
    const track = trackRef.current;
    if (!track) return;

    dragRef.current = {
      active: true,
      startX: e.clientX,
      scrollLeft: track.scrollLeft,
      moved: false,
    };
    track.setPointerCapture(e.pointerId);
    track.style.scrollSnapType = "none";
    track.style.cursor = "grabbing";
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const track = trackRef.current;
    if (!track) return;

    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 6) dragRef.current.moved = true;
    track.scrollLeft = dragRef.current.scrollLeft - dx;
  };

  const endPointerDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const track = trackRef.current;
    dragRef.current.active = false;
    if (!track) return;

    track.releasePointerCapture(e.pointerId);
    track.style.cursor = "";
    track.style.scrollSnapType = "";

    if (!dragRef.current.moved) return;

    const slidesEls = Array.from(track.querySelectorAll<HTMLElement>("[data-carousel-slide]"));
    const center = track.scrollLeft + track.clientWidth / 2;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    slidesEls.forEach((slide, i) => {
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
      const distance = Math.abs(slideCenter - center);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    });

    scrollTo(bestIndex, "smooth");
  };

  const goPrev = () => scrollTo(active - 1);
  const goNext = () => scrollTo(active + 1);

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
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointerDrag}
          onPointerCancel={endPointerDrag}
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
                onClick={() => scrollTo(i)}
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
