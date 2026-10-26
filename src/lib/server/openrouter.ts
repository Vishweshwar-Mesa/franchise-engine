import "server-only";
import type { z } from "zod";
import { createHash } from "crypto";
import { db } from "./db";

// AI calls. Provider order: Gemini (GEMINI_API_KEYS + GEMINI_MODEL), then OpenRouter
// (OPENROUTER_API_KEY + OPENROUTER_MODEL). No model is hardcoded. Every failure returns null
// so callers fall back to ledger templates. Answers are cached in Neon (ai_cache).

export const GROUND_RULES =
  "You are a helper inside a franchise-applicant review tool. Use ONLY the data given to you. " +
  "Never add facts, numbers, fees, laws, durations or statistics that are not in the data. " +
  "You never decide, approve or reject anything: statuses and scores come from a deterministic engine and you must not change or contradict them. " +
  "If something is not in the data, say it is not in the data. Reply with JSON only, in the exact shape requested.";

type Msg = { role: "system" | "user"; content: string };
type Opts = { maxTokens: number; timeoutMs?: number; webSearch?: boolean };

const geminiKeys = () => (process.env.GEMINI_API_KEYS ?? "").split(",").map((k) => k.trim()).filter(Boolean);
const geminiOn = () => geminiKeys().length > 0 && !!process.env.GEMINI_MODEL;
const openrouterOn = () => !!process.env.OPENROUTER_API_KEY && !!process.env.OPENROUTER_MODEL;

export function aiConfigured(): boolean {
  return geminiOn() || openrouterOn();
}

let nextKey = 0;

/** Gemini generateContent. Rotates through the keys: a quota, auth or server error tries the next key. */
async function gemini(messages: Msg[], opts: Opts): Promise<string | null> {
  const keys = geminiKeys();
  const body = {
    systemInstruction: { parts: [{ text: GROUND_RULES }] },
    contents: [{ role: "user", parts: [{ text: messages.map((m) => m.content).join("\n\n") }] }],
    generationConfig: {
      maxOutputTokens: opts.maxTokens,
      temperature: 0.2,
      thinkingConfig: { thinkingLevel: "low" },
      // Google Search grounding cannot be combined with JSON mode; the JSON is parsed from text instead.
      ...(opts.webSearch ? {} : { responseMimeType: "application/json" }),
    },
    ...(opts.webSearch ? { tools: [{ google_search: {} }] } : {}),
  };
  for (let i = 0; i < keys.length; i++) {
    const key = keys[(nextKey + i) % keys.length];
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(process.env.GEMINI_MODEL!)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 25000),
    });
    if (res.ok) {
      nextKey = (nextKey + i + 1) % keys.length;
      const data = await res.json();
      const parts: { text?: string; thought?: boolean }[] = data?.candidates?.[0]?.content?.parts ?? [];
      return parts.filter((p) => !p.thought).map((p) => p.text ?? "").join("") || null;
    }
    if (![401, 403, 429, 500, 503].includes(res.status)) return null;
  }
  return null;
}

async function openrouter(messages: Msg[], opts: Opts): Promise<string | null> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "X-Title": "Go Colors Franchise Engine" },
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
  return body?.choices?.[0]?.message?.content ?? null;
}

export async function aiJson<S extends z.ZodType>(schema: S, messages: Msg[], opts: Opts = { maxTokens: 800 }): Promise<z.infer<S> | null> {
  if (!aiConfigured()) return null;
  const sql = db();
  const model = geminiOn() ? `gemini:${process.env.GEMINI_MODEL}` : `openrouter:${process.env.OPENROUTER_MODEL}`;
  const cacheKey = createHash("sha256").update(JSON.stringify([model, messages, opts.webSearch ?? false])).digest("hex");
  try {
    if (sql && !opts.webSearch) {
      const rows = await sql`select response from ai_cache where key = ${cacheKey}`;
      const hit = rows[0] ? schema.safeParse(rows[0].response) : null;
      if (hit?.success) return hit.data;
    }
    // Thinking models spend part of the budget reasoning, so give Gemini headroom over the cap.
    let content = geminiOn() ? await gemini(messages, { ...opts, maxTokens: opts.maxTokens * 2 + 512 }).catch(() => null) : null;
    if (!content && openrouterOn()) content = await openrouter(messages, opts).catch(() => null);
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
