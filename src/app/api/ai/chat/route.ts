import { z } from "zod";
import { ChatResponse } from "@/lib/ai-schemas";
import { aiJson } from "@/lib/server/openrouter";

// Chat over the ledger. The AI answers "why" questions from the ledger only, or returns a
// structured what-if that the browser re-runs through the engine on a copy.
const Input = z.object({
  question: z.string().min(1).max(1000),
  context: z.unknown(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) })).max(10).optional(),
});

export async function POST(req: Request) {
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ available: false });
  const ctx = JSON.stringify(parsed.data.context);
  if (ctx.length > 60000) return Response.json({ available: false });
  const history = (parsed.data.history ?? []).map((h) => `${h.role}: ${h.content}`).join("\n");
  const res = await aiJson(
    ChatResponse,
    [
      {
        role: "user",
        content:
          "Answer the reviewer's question using ONLY the ledger data below. If the answer is not in the data, answer exactly: \"That isn't in the data.\" " +
          "Quote statuses, IDs, scores and reasons exactly. Keep it short. " +
          'If the question is a what-if (a hypothetical change to one applicant), set "whatIf" to {"id": "APP-xxx", "changes": {field: value}} using only these fields: ' +
          "name, city, state, pin, investment, experience, business, spaceAvailable (Owned|Rented|Not yet identified), spaceSize, floor (Ground|Upper|Mall unit|Not known), targetLaunch, language, notes; " +
          'and set "answer" to one line saying what will be re-run. Otherwise set "whatIf" to null. Reply as {"answer":"...","whatIf":null}.\n\n' +
          (history ? `Conversation so far:\n${history}\n\n` : "") +
          `Ledger data:\n${ctx}\n\nQuestion: ${parsed.data.question}`,
      },
    ],
    { maxTokens: 600 },
  );
  return res ? Response.json({ available: true, ...res }) : Response.json({ available: false });
}
