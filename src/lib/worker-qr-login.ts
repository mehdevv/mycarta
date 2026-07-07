import { tenantEmployeeLink } from "@/lib/links";

/** URL encoded in owner-dashboard worker login QR (opens employee login + auto sign-in). */
export function tenantEmployeeQrLoginLink(slug: string, workerQrToken: string) {
  const url = new URL(tenantEmployeeLink(slug));
  url.searchParams.set("qr", workerQrToken);
  return url.toString();
}

export function readWorkerQrTokenFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const token = new URLSearchParams(window.location.search).get("qr")?.trim();
  if (!token) return null;
  if (/^[0-9a-f-]{36}$/i.test(token)) return token;
  return null;
}

export function clearWorkerQrFromLocation(slug: string) {
  if (typeof window === "undefined") return;
  const path = slug ? `/${slug}/employee` : "/employee";
  window.history.replaceState({}, "", path);
}
