import { createContext, useCallback, useContext, useState } from "react";

type DashboardTourContextValue = {
  isOpen: boolean;
  startTour: () => void;
  closeTour: () => void;
};

const DashboardTourContext = createContext<DashboardTourContextValue>({
  isOpen: false,
  startTour: () => {},
  closeTour: () => {},
});

export function DashboardTourProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const startTour = useCallback(() => setIsOpen(true), []);
  const closeTour = useCallback(() => setIsOpen(false), []);

  return (
    <DashboardTourContext.Provider value={{ isOpen, startTour, closeTour }}>
      {children}
    </DashboardTourContext.Provider>
  );
}

export function useDashboardTour() {
  return useContext(DashboardTourContext);
}
