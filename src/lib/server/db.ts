import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Neon Postgres over HTTP. Returns null when DATABASE_URL is not set, and every caller then
// falls back (browser storage, in-memory cache, no stored account).
let client: NeonQueryFunction<false, false> | null | undefined;

export function db(): NeonQueryFunction<false, false> | null {
  if (client !== undefined) return client;
  const url = process.env.DATABASE_URL;
  client = url ? neon(url) : null;
  return client;
}

export const isSessionId = (s: unknown): s is string => typeof s === "string" && /^[A-Za-z0-9-]{8,64}$/.test(s);
