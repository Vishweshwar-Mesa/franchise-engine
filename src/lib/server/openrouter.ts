import "server-only";
import type { z } from "zod";
import { createHash } from "crypto";
import { db } from "./db";

// OpenRouter (OpenAI-compatible). The model comes only from OPENROUTER_MODEL: no model is
// hardcoded. Every failure returns null so callers fall back to ledger templates.

export const GROUND_RULES =
  "You are a helper inside a franchise-applicant review tool. Use ONLY the data given to you. " +
  "Never add facts, numbers, fees, laws, durations or statistics that are not in the data. " +
  "You never decide, approve or reject anything: statuses and scores come from a deterministic engine and you must not change or contradict them. " +
  "If something is not in the data, say it is not in the data. Reply with JSON only, in the exact shape requested.";

export function aiConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY && !!process.env.OPENROUTER_MODEL;
}

export async function aiJson<S extends z.ZodType>(
  schema: S,
  messages: { role: "system" | "user"; content: string }[],
  opts: { maxTokens: number; timeoutMs?: number; webSearch?: boolean } = { maxTokens: 800 },
): Promise<z.infer<S> | null> {
  if (!aiConfigured()) return null;
  const sql = db();
  const cacheKey = createHash("sha256").update(JSON.stringify([process.env.OPENROUTER_MODEL, messages, opts.webSearch ?? false])).digest("hex");
  try {
    if (sql && !opts.webSearch) {
      const rows = await sql`select response from ai_cache where key = ${cacheKey}`;
      const hit = rows[0] ? schema.safeParse(rows[0].response) : null;
      if (hit?.success) return hit.data;
    }
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "X-Title": "Franchise Partner Engine",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL,
        messages: [{ role: "system", content: GROUND_RULES }, ...messages],
        max_tokens: opts.maxTokens,
        temperature: 0.2,
        response_format: { type: "json_object" },
        ...(opts.webSearch ? { plugins: [{ id: "web", max_results: 5 }] } : {}),
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 25000),
    });
    if (!res.ok) return null;
    const body = await res.json();
    const content: string | undefined = body?.choices?.[0]?.message?.content;
    if (!content) return null;
    const jsonText = content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1);
    const parsed = schema.safeParse(JSON.parse(jsonText));
    if (!parsed.success) return null;
    if (sql && !opts.webSearch) {
      await sql`insert into ai_cache (key, response) values (${cacheKey}, ${JSON.stringify(parsed.data)}::jsonb) on conflict (key) do update set response = excluded.response`;
    }
    return parsed.data;
  } catch {
    return null;
  }
}
