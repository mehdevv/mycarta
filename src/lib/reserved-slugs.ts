/** Route segments that cannot be used as tenant slugs */
export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "card",
  "client",
  "dashboard",
  "employee",
  "emloyee",
  "enrol",
  "login",
  "platform",
  "pulse-fidelite",
  "reward",
  "rewards",
  "setup",
  "shop",
  "signup",
  "tarifs",
  "worker",
  "www",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}
