import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, getMeQueryKey, type User } from "@/api";
import { getActiveAuthSlot, type AuthSlot } from "@/lib/auth-slots";
import { migrateLegacyAuthSession, supabaseBusiness, supabaseWorker } from "@/lib/supabase";

interface AuthContextType {
  /** User for the active route context (business or worker). */
  user: User | null;
  businessUser: User | null;
  workerUser: User | null;
  activeSlot: AuthSlot;
  isLoading: boolean;
  isBusinessLoading: boolean;
  isWorkerLoading: boolean;
  login: (slot: AuthSlot) => void;
  logout: (slot?: AuthSlot) => Promise<void>;
  logoutBusiness: () => Promise<void>;
  logoutWorker: () => Promise<void>;
  isAuthenticated: boolean;
  isBusinessAuthenticated: boolean;
  isWorkerAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  businessUser: null,
  workerUser: null,
  activeSlot: "business",
  isLoading: true,
  isBusinessLoading: true,
  isWorkerLoading: true,
  login: () => {},
  logout: async () => {},
  logoutBusiness: async () => {},
  logoutWorker: async () => {},
  isAuthenticated: false,
  isBusinessAuthenticated: false,
  isWorkerAuthenticated: false,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionReady, setSessionReady] = useState(false);
  const [activeSlot, setActiveSlotState] = useState<AuthSlot>(getActiveAuthSlot);
  const queryClient = useQueryClient();

  useEffect(() => {
    const boot = async () => {
      await migrateLegacyAuthSession();
      await Promise.all([
        supabaseBusiness.auth.getSession(),
        supabaseWorker.auth.getSession(),
      ]);
      setSessionReady(true);
    };
    void boot();

    const businessSub = supabaseBusiness.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries({ queryKey: getMeQueryKey("business") });
    });
    const workerSub = supabaseWorker.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries({ queryKey: getMeQueryKey("worker") });
    });

    const syncSlot = () => setActiveSlotState(getActiveAuthSlot());
    const onSlotChange = (event: Event) => {
      setActiveSlotState((event as CustomEvent<AuthSlot>).detail);
    };
    syncSlot();
    window.addEventListener("popstate", syncSlot);
    window.addEventListener("carta:active-auth-slot", onSlotChange);

    return () => {
      businessSub.data.subscription.unsubscribe();
      workerSub.data.subscription.unsubscribe();
      window.removeEventListener("popstate", syncSlot);
      window.removeEventListener("carta:active-auth-slot", onSlotChange);
    };
  }, [queryClient]);

  const {
    data: businessUser,
    isLoading: isBusinessUserLoading,
    error: businessError,
  } = useGetMe("business", {
    query: {
      enabled: sessionReady,
      retry: false,
    },
  });

  const {
    data: workerUser,
    isLoading: isWorkerUserLoading,
    error: workerError,
  } = useGetMe("worker", {
    query: {
      enabled: sessionReady,
      retry: false,
    },
  });

  const login = (slot: AuthSlot) => {
    queryClient.invalidateQueries({ queryKey: getMeQueryKey(slot) });
  };

  const logoutBusiness = async () => {
    await supabaseBusiness.auth.signOut();
    queryClient.invalidateQueries({ queryKey: getMeQueryKey("business") });
    queryClient.removeQueries({ queryKey: getMeQueryKey("business") });
  };

  const logoutWorker = async () => {
    await supabaseWorker.auth.signOut();
    queryClient.invalidateQueries({ queryKey: getMeQueryKey("worker") });
    queryClient.removeQueries({ queryKey: getMeQueryKey("worker") });
  };

  const logout = async (slot: AuthSlot = getActiveAuthSlot()) => {
    if (slot === "worker") await logoutWorker();
    else await logoutBusiness();
  };

  useEffect(() => {
    if (businessError) void logoutBusiness();
  }, [businessError]);

  useEffect(() => {
    if (workerError) void logoutWorker();
  }, [workerError]);

  const contextUser = activeSlot === "worker" ? (workerUser ?? null) : (businessUser ?? null);

  const value = useMemo<AuthContextType>(
    () => ({
      user: contextUser,
      businessUser: businessUser ?? null,
      workerUser: workerUser ?? null,
      activeSlot,
      isLoading: !sessionReady || (activeSlot === "worker" ? isWorkerUserLoading : isBusinessUserLoading),
      isBusinessLoading: !sessionReady || isBusinessUserLoading,
      isWorkerLoading: !sessionReady || isWorkerUserLoading,
      login,
      logout,
      logoutBusiness,
      logoutWorker,
      isAuthenticated: !!contextUser,
      isBusinessAuthenticated: !!businessUser,
      isWorkerAuthenticated: !!workerUser,
    }),
    [
      activeSlot,
      businessUser,
      workerUser,
      contextUser,
      sessionReady,
      isBusinessUserLoading,
      isWorkerUserLoading,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
