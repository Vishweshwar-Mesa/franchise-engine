import { z } from "zod";
import { AssessResponse } from "@/lib/ai-schemas";
import { aiJson } from "@/lib/server/openrouter";

// Rates the relevance of each applicant's current/past business and flags notes that
// contradict the fields. Suggestions only. Bounded: at most 100 applicants, 25 per call.
const Input = z.object({
  items: z
    .array(
      z.object({
        id: z.string().max(40),
        business: z.string().max(500),
        notes: z.string().max(1000),
        spaceAvailable: z.string().max(40),
        spaceSize: z.number().nullable(),
        floor: z.string().max(40),
        experienceYears: z.number().nullable(),
      }),
    )
    .max(100),
});

export async function POST(req: Request) {
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ available: false, results: [] });
  const items = parsed.data.items;
  const chunks: (typeof items)[] = [];
  for (let i = 0; i < items.length; i += 25) chunks.push(items.slice(i, i + 25));
  const out: z.infer<typeof AssessResponse>["results"] = [];
  let available = true;
  for (const chunk of chunks) {
    const res = await aiJson(
      AssessResponse,
      [
        {
          role: "user",
          content:
            "The brand is Go Colors, an apparel retailer (women's bottom-wear and related clothing) opening franchise stores. " +
            "For each applicant: (1) rate how relevant their current/past business is to running an apparel retail store: High (apparel/footwear/fashion retail), Medium (other retail or shop management), Low (no retail). Give a one-line reason quoting their words. " +
            "(2) contradiction.found = true only if the 'notes' text clearly contradicts the structured fields (e.g. notes say they have no shop but spaceAvailable is Rented). Otherwise false with empty detail. " +
            'Reply as {"results":[{"id":"...","relevance":"High|Medium|Low","reason":"...","contradiction":{"found":false,"detail":""}}]}.\n\n' +
            JSON.stringify(chunk),
        },
      ],
      { maxTokens: 120 * chunk.length + 200, timeoutMs: 40000 },
    );
    if (!res) {
      available = false;
      break;
    }
    const ids = new Set(chunk.map((c) => c.id));
    out.push(...res.results.filter((r) => ids.has(r.id)));
  }
  return Response.json({ available, results: out });
}
