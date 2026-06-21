import { createContext, useCallback, useContext, useRef, useState } from "react";

const VIDEO_TUTORIAL_SEEN_KEY = "carta-dashboard-video-tutorial-seen";

type DashboardTourContextValue = {
  isOpen: boolean;
  startTour: () => void;
  closeTour: () => void;
  registerOpenMobileNav: (opener: () => void) => void;
  ensureMobileNavVisible: () => void;
  videoTutorialOpen: boolean;
  openVideoTutorial: () => void;
  closeVideoTutorial: () => void;
  openVideoTutorialAfterTour: () => void;
};

const DashboardTourContext = createContext<DashboardTourContextValue>({
  isOpen: false,
  startTour: () => {},
  closeTour: () => {},
  registerOpenMobileNav: () => {},
  ensureMobileNavVisible: () => {},
  videoTutorialOpen: false,
  openVideoTutorial: () => {},
  closeVideoTutorial: () => {},
  openVideoTutorialAfterTour: () => {},
});

export function DashboardTourProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [videoTutorialOpen, setVideoTutorialOpen] = useState(false);
  const openMobileNavRef = useRef<(() => void) | null>(null);

  const startTour = useCallback(() => setIsOpen(true), []);
  const closeTour = useCallback(() => setIsOpen(false), []);
  const openVideoTutorial = useCallback(() => setVideoTutorialOpen(true), []);
  const closeVideoTutorial = useCallback(() => {
    setVideoTutorialOpen(false);
    try {
      localStorage.setItem(VIDEO_TUTORIAL_SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const openVideoTutorialAfterTour = useCallback(() => {
    try {
      if (localStorage.getItem(VIDEO_TUTORIAL_SEEN_KEY)) return;
    } catch {
      /* ignore */
    }
    window.setTimeout(() => setVideoTutorialOpen(true), 320);
  }, []);

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
      value={{
        isOpen,
        startTour,
        closeTour,
        registerOpenMobileNav,
        ensureMobileNavVisible,
        videoTutorialOpen,
        openVideoTutorial,
        closeVideoTutorial,
        openVideoTutorialAfterTour,
      }}
    >
      {children}
    </DashboardTourContext.Provider>
  );
}

export function useDashboardTour() {
  return useContext(DashboardTourContext);
}
