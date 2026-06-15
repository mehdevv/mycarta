/** Shared lookup helper for edge functions — card_code first, legacy UUID fallback. */
export function normalizeCardLookup(raw: string): string {
  const trimmed = raw.trim();
  try {
    const parts = new URL(trimmed).pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] ?? trimmed;
    if (/^\d{1,6}$/.test(last)) return last.padStart(6, "0");
    return last;
  } catch {
    if (/^\d{1,6}$/.test(trimmed)) return trimmed.padStart(6, "0");
    return trimmed;
  }
}

export async function findClientByCardToken(
  admin: { from: (table: string) => { select: (cols: string) => { eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: Record<string, unknown> | null }> } } } },
  rawToken: string,
) {
  const token = normalizeCardLookup(rawToken);

  const byCode = await admin
    .from("clients")
    .select("*")
    .eq("card_code", token)
    .maybeSingle();
  if (byCode.data) return byCode.data;

  if (/^[0-9a-f-]{36}$/i.test(token)) {
    const byUuid = await admin
      .from("clients")
      .select("*")
      .eq("fidelity_qr_token", token)
      .maybeSingle();
    if (byUuid.data) return byUuid.data;
  }

  return null;
}
