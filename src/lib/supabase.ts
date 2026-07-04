import { createClient, FunctionsFetchError, FunctionsHttpError, type SupabaseClient } from "@supabase/supabase-js";
import { AUTH_STORAGE_KEYS, getActiveAuthSlot, type AuthSlot } from "@/lib/auth-slots";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function createAuthClient(storageKey: string): SupabaseClient {
  return createClient(supabaseUrl || "https://placeholder.supabase.co", supabaseAnonKey || "placeholder", {
    auth: {
      storageKey,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabaseBusiness = createAuthClient(AUTH_STORAGE_KEYS.business);
export const supabaseWorker = createAuthClient(AUTH_STORAGE_KEYS.worker);

/** Business portal APIs (dashboard, platform, rep, affiliate). */
export const supabase = supabaseBusiness;

export function getSupabaseClient(slot: AuthSlot = getActiveAuthSlot()): SupabaseClient {
  return slot === "worker" ? supabaseWorker : supabaseBusiness;
}

let legacyMigrationStarted = false;

/** Move a pre-dual-session JWT into the correct slot once. */
export async function migrateLegacyAuthSession() {
  if (legacyMigrationStarted || typeof window === "undefined") return;
  legacyMigrationStarted = true;

  const [{ data: businessSession }, { data: workerSession }] = await Promise.all([
    supabaseBusiness.auth.getSession(),
    supabaseWorker.auth.getSession(),
  ]);
  if (businessSession.session || workerSession.session) return;

  const legacyClient = createClient(
    supabaseUrl || "https://placeholder.supabase.co",
    supabaseAnonKey || "placeholder",
  );
  const { data: { session } } = await legacyClient.auth.getSession();
  if (!session) return;

  const { data: profile } = await legacyClient
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();

  const target = profile?.role === "worker" ? supabaseWorker : supabaseBusiness;
  await target.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  await legacyClient.auth.signOut();
}

async function getFunctionErrorMessage(
  name: string,
  error: unknown,
  data: unknown,
): Promise<string> {
  if (data && typeof data === "object" && "error" in data && data.error) {
    return String(data.error);
  }

  if (error instanceof FunctionsFetchError) {
    return `Could not reach the "${name}" Edge Function. Deploy it in Supabase Dashboard → Edge Functions.`;
  }

  if (error instanceof FunctionsHttpError && error.context instanceof Response) {
    if (error.context.status === 404) {
      return `The "${name}" Edge Function is not deployed. Add it in Supabase Dashboard → Edge Functions.`;
    }
    try {
      const body = await error.context.clone().json();
      if (body && typeof body === "object") {
        if ("error" in body && body.error) return String(body.error);
        if ("message" in body && body.message) return String(body.message);
      }
    } catch {
      // Fall through to generic message.
    }
  }

  if (error instanceof Error) return error.message;
  return "Request failed";
}

export async function invokeFunction<T>(
  name: string,
  body?: Record<string, unknown>,
  slot: AuthSlot = getActiveAuthSlot(),
): Promise<T> {
  const client = getSupabaseClient(slot);
  const { data, error } = await client.functions.invoke(name, { body });
  if (error) throw new Error(await getFunctionErrorMessage(name, error, data));
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String(data.error));
  }
  if (data == null) {
    throw new Error(`Empty response from "${name}"`);
  }
  return data as T;
}

export function extractQrToken(raw: string): string {
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] ?? trimmed;
    if (/^\d{1,6}$/.test(last)) return last.padStart(6, "0");
    return last;
  } catch {
    if (/^\d{1,6}$/.test(trimmed)) return trimmed.padStart(6, "0");
    return trimmed;
  }
}

export type ParsedQr =
  | { type: "card"; token: string }
  | { type: "reward"; rewardId: string };

export function parseScannedQr(raw: string): ParsedQr {
  const trimmed = raw.trim();
  const rewardMatch = trimmed.match(/^reward:([0-9a-f-]{36})$/i);
  if (rewardMatch) {
    return { type: "reward", rewardId: rewardMatch[1] };
  }
  return { type: "card", token: extractQrToken(trimmed) };
}
