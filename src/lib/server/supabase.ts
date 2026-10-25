import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-side Supabase client using the service role key. Returns null when Supabase is not
// configured, and every caller then falls back (browser storage, no upload, no account).
let client: SupabaseClient | null | undefined;

export function supabaseAdmin(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return client;
}

export const isSessionId = (s: unknown): s is string => typeof s === "string" && /^[A-Za-z0-9-]{8,64}$/.test(s);
