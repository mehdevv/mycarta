/** Normalize phone for comparison (matches enrol-client). */
export function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, "").trim();
}

export function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  return na === nb;
}
