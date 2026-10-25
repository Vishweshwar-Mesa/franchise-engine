import { z } from "zod";
import { ResearchResponse } from "@/lib/ai-schemas";
import { aiJson } from "@/lib/server/openrouter";

// Reviewer-only people research through the AI's web search. Returns links labelled
// "possible match, unverified". Never stored in the ledger and never used in decisions.
const Input = z.object({ name: z.string().min(2).max(100), city: z.string().max(60), business: z.string().max(300), consent: z.literal(true) });

export async function POST(req: Request) {
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ available: false, links: [] });
  const { name, city, business } = parsed.data;
  const res = await aiJson(
    ResearchResponse,
    [
      {
        role: "user",
        content:
          `Search the web for public pages that might be about this person: "${name}", ${city}, India; business described as: "${business}". ` +
          "Return up to 5 links that might match. For each, a title, the URL exactly as found, and one neutral line on why it might match. " +
          "Do not state anything about the person as fact, do not guess, and do not include links you did not find. If nothing is found return an empty list. " +
          'Reply as {"links":[{"title":"...","url":"https://...","why":"..."}]}.',
      },
    ],
    { maxTokens: 700, webSearch: true, timeoutMs: 45000 },
  );
  if (!res) return Response.json({ available: false, links: [] });
  return Response.json({ available: true, links: res.links.filter((l) => /^https?:\/\//.test(l.url)) });
}
