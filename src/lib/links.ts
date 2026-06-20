/**
 * App and Supabase Edge Function URLs for local dev and production.
 * Uses window.location.origin in the browser; falls back to localhost:5173 during SSR/build.
 */

const DEFAULT_LOCAL_ORIGIN = "http://localhost:5173";

export const APP_PATHS = {
  home: "/",
  client: "/client",
  admin: "/shop",
  shop: "/shop",
  employee: "/employee",
  setup: "/setup",
  login: "/shop",
  enrol: "/enrol",
  dashboard: "/dashboard",
  worker: "/worker",
} as const;

export const EDGE_FUNCTION_NAMES = [
  "setup-owner",
  "enrol-client",
  "login-client",
  "create-worker",
  "purchase-scan",
  "confirm-purchase-scan",
] as const;

export type EdgeFunctionName = (typeof EDGE_FUNCTION_NAMES)[number];

export function getAppOrigin() {
  if (typeof window !== "undefined") return window.location.origin;
  return DEFAULT_LOCAL_ORIGIN;
}

export function appLink(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getAppOrigin()}${normalized}`;
}

/** Customer enrolment page for a specific shop */
export function tenantClientLink(slug: string) {
  return appLink(`/${slug}/client`);
}

/** Tenant-scoped worker sign-in page */
export function tenantEmployeeLink(slug: string) {
  return appLink(`/${slug}/employee`);
}

/** @deprecated Use tenantEmployeeLink(slug) */
export function employeeLoginLink(slug?: string) {
  if (slug) return tenantEmployeeLink(slug);
  return appLink(APP_PATHS.employee);
}

export function getSupabaseUrl() {
  return import.meta.env.VITE_SUPABASE_URL ?? "";
}

export function edgeFunctionLink(name: EdgeFunctionName | string) {
  const base = getSupabaseUrl().replace(/\/$/, "");
  return `${base}/functions/v1/${name}`;
}

/** Static localhost URLs — open these while running `npm run dev` */
export const LOCAL_APP_LINKS = {
  home: `${DEFAULT_LOCAL_ORIGIN}/`,
  client: `${DEFAULT_LOCAL_ORIGIN}/client`,
  shop: `${DEFAULT_LOCAL_ORIGIN}/shop`,
  employee: `${DEFAULT_LOCAL_ORIGIN}/employee`,
  setup: `${DEFAULT_LOCAL_ORIGIN}/setup`,
  dashboard: `${DEFAULT_LOCAL_ORIGIN}/dashboard`,
  worker: `${DEFAULT_LOCAL_ORIGIN}/worker`,
} as const;

export function getLocalEdgeFunctionLinks() {
  const base = getSupabaseUrl().replace(/\/$/, "");
  return Object.fromEntries(
    EDGE_FUNCTION_NAMES.map((name) => [name, `${base}/functions/v1/${name}`]),
  ) as Record<EdgeFunctionName, string>;
}

export const APP_LINK_GROUPS = [
  {
    title: "Public",
    links: [
      { label: "Customer signup", path: APP_PATHS.client },
      { label: "Shop login", path: APP_PATHS.shop },
      { label: "Employee login", path: APP_PATHS.employee },
      { label: "First-time owner setup", path: APP_PATHS.setup },
    ],
  },
  {
    title: "After sign in",
    links: [
      { label: "Owner dashboard", path: APP_PATHS.dashboard },
      { label: "Worker app", path: APP_PATHS.worker },
    ],
  },
] as const;

export const EDGE_FUNCTION_META: Record<
  EdgeFunctionName,
  { jwt: "on" | "off"; source: string; usedBy: string }
> = {
  "setup-owner": {
    jwt: "off",
    source: "supabase/functions/setup-owner/index.ts",
    usedBy: "Owner setup (/setup)",
  },
  "enrol-client": {
    jwt: "off",
    source: "supabase/functions/enrol-client/index.ts",
    usedBy: "Customer signup (/client → Create card)",
  },
  "login-client": {
    jwt: "off",
    source: "supabase/functions/login-client/index.ts",
    usedBy: "Customer sign in (/client → Sign in)",
  },
  "create-worker": {
    jwt: "on",
    source: "supabase/functions/create-worker/index.ts",
    usedBy: "Dashboard → Workers",
  },
  "purchase-scan": {
    jwt: "on",
    source: "supabase/functions/purchase-scan/index.ts",
    usedBy: "Worker scan flow",
  },
  "confirm-purchase-scan": {
    jwt: "on",
    source: "supabase/functions/confirm-purchase-scan/index.ts",
    usedBy: "Worker product confirmation",
  },
};
