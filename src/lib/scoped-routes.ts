const WORKER_SLUG_KEY = "carta-worker-slug";
const CLIENT_SLUG_KEY = "carta-client-slug";

export function rememberWorkerTenantSlug(slug: string) {
  try {
    sessionStorage.setItem(WORKER_SLUG_KEY, slug);
  } catch {
    // ignore
  }
}

export function getWorkerTenantSlug() {
  try {
    return sessionStorage.getItem(WORKER_SLUG_KEY);
  } catch {
    return null;
  }
}

export function rememberClientTenantSlug(slug: string) {
  try {
    sessionStorage.setItem(CLIENT_SLUG_KEY, slug);
  } catch {
    // ignore
  }
}

export function getClientTenantSlug() {
  try {
    return sessionStorage.getItem(CLIENT_SLUG_KEY);
  } catch {
    return null;
  }
}

export function employeeLoginPath(slug?: string | null) {
  return slug ? `/${slug}/employee` : "/employee";
}

export function clientEnrolPath(slug: string) {
  return `/${slug}/client`;
}

export function clientCardPath(slug: string, code: string) {
  return `/${slug}/card/${code}`;
}

export function resolveClientCardPath(code: string, slug?: string | null) {
  const resolvedSlug = slug ?? getClientTenantSlug();
  return resolvedSlug ? clientCardPath(resolvedSlug, code) : `/card/${code}`;
}
