export type AuthSlot = "business" | "worker";

export const AUTH_STORAGE_KEYS: Record<AuthSlot, string> = {
  business: "carta-auth-business",
  worker: "carta-auth-worker",
};

let activeAuthSlot: AuthSlot = "business";

export function setActiveAuthSlot(slot: AuthSlot) {
  activeAuthSlot = slot;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("carta:active-auth-slot", { detail: slot }));
  }
}

export function getActiveAuthSlot(): AuthSlot {
  return activeAuthSlot;
}

/** Employee portal paths (per-tenant login + scanner). */
export function isWorkerRoute(pathname: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === "/worker" || path.startsWith("/worker/")) return true;
  if (path === "/employee" || path.endsWith("/employee")) return true;
  return false;
}

/** Worker portal routes use the worker session; owner dashboard uses business. */
export function authSlotForPath(pathname: string): AuthSlot {
  return isWorkerRoute(pathname) ? "worker" : "business";
}

export function isWorkerRole(role: string | undefined | null): boolean {
  return role === "worker";
}

export function isBusinessPortalRole(role: string | undefined | null): boolean {
  return role === "owner" || role === "super_admin" || role === "sales_rep" || role === "affiliate";
}
