import { createContext, useCallback, useContext, useRef, useState } from "react";

type DashboardTourContextValue = {
  isOpen: boolean;
  startTour: () => void;
  closeTour: () => void;
  registerOpenMobileNav: (opener: () => void) => void;
  ensureMobileNavVisible: () => void;
};

const DashboardTourContext = createContext<DashboardTourContextValue>({
  isOpen: false,
  startTour: () => {},
  closeTour: () => {},
  registerOpenMobileNav: () => {},
  ensureMobileNavVisible: () => {},
});

export function DashboardTourProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const openMobileNavRef = useRef<(() => void) | null>(null);

  const startTour = useCallback(() => setIsOpen(true), []);
  const closeTour = useCallback(() => setIsOpen(false), []);

  const registerOpenMobileNav = useCallback((opener: () => void) => {
    openMobileNavRef.current = opener;
  }, []);

  const ensureMobileNavVisible = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      openMobileNavRef.current?.();
    }
  }, []);

  return (
    <DashboardTourContext.Provider
      value={{ isOpen, startTour, closeTour, registerOpenMobileNav, ensureMobileNavVisible }}
    >
      {children}
    </DashboardTourContext.Provider>
  );
}

export function useDashboardTour() {
  return useContext(DashboardTourContext);
}
