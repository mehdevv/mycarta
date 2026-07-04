import { createClient, FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder",
);

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
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
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
