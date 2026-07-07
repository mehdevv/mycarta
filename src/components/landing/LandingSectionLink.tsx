import type { ReactNode, MouseEvent, CSSProperties } from "react";
import { useLocation } from "wouter";
import { goToLandingSection } from "@/lib/landing-scroll";
import { cn } from "@/lib/utils";

type LandingSectionLinkProps = {
  sectionId: string;
  className?: string;
  style?: CSSProperties;
  title?: string;
  children: ReactNode;
  onNavigate?: () => void;
};

export function LandingSectionLink({
  sectionId,
  className,
  style,
  title,
  children,
  onNavigate,
}: LandingSectionLinkProps) {
  const [pathname, setLocation] = useLocation();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onNavigate?.();
    goToLandingSection(sectionId, pathname, setLocation);
  };

  return (
    <a href={`/#${sectionId}`} className={cn(className)} style={style} title={title} onClick={handleClick}>
      {children}
    </a>
  );
}
