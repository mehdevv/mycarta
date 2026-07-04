import { useEffect } from "react";
import { useLocation } from "wouter";
import { authSlotForPath, setActiveAuthSlot } from "@/lib/auth-slots";

/** Keeps the active API auth slot aligned with the current route. */
export function AuthRouteSync() {
  const [location] = useLocation();

  useEffect(() => {
    setActiveAuthSlot(authSlotForPath(location));
  }, [location]);

  return null;
}
