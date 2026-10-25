import { z } from "zod";
import { ExplainResponse } from "@/lib/ai-schemas";
import { aiJson } from "@/lib/server/openrouter";

// Rewrites one ledger entry as a plain-language explanation, next steps and a training plan
// in the applicant's preferred language. The ledger is the only input.
const Input = z.object({ entry: z.record(z.string(), z.unknown()), language: z.string().max(30) });

export async function POST(req: Request) {
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ available: false });
  const { entry, language } = parsed.data;
  const json = JSON.stringify(entry);
  if (json.length > 20000) return Response.json({ available: false });
  const res = await aiJson(
    ExplainResponse,
    [
      {
        role: "user",
        content:
          `Write in ${language}. Using only this ledger entry, return: ` +
          '"summary": 2-4 plain sentences for a reviewer explaining the status and the main reasons (keep the status name, IDs, pins and numbers exactly as given); ' +
          '"nextSteps": the next steps, rewritten plainly (do not add new ones); ' +
          '"training": a training plan for this applicant as a new franchisee: 3-6 modules, each with a one-line why tied to the ledger (e.g. experience score, space, language). No durations, dates or costs. ' +
          'If the status is not Good to go, the training plan is still a draft for later.\n\nLedger entry:\n' + json,
      },
    ],
    { maxTokens: 900 },
  );
  return res ? Response.json({ available: true, ...res }) : Response.json({ available: false });
}
