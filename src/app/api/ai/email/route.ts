import { z } from "zod";
import { EmailResponse } from "@/lib/ai-schemas";
import { aiJson } from "@/lib/server/openrouter";
import { allow } from "@/lib/server/limit";

// Drafts the confirmation email in the applicant's language from the facts given only.
const Input = z.object({ language: z.string().max(30), facts: z.record(z.string(), z.unknown()) });

export async function POST(req: Request) {
  if (!allow(req, "email", 10)) return Response.json({ available: false });
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ available: false });
  const facts = JSON.stringify(parsed.data.facts);
  if (facts.length > 8000) return Response.json({ available: false });
  const res = await aiJson(
    EmailResponse,
    [
      {
        role: "user",
        content:
          `Write a short, warm confirmation email in ${parsed.data.language} to a franchise applicant whose application a reviewer has confirmed. ` +
          "Say the next stage is paperwork, list the paperwork items given, and mention any deal terms ONLY if they are in the facts (never invent fees, dates or durations). " +
          "Do not claim anything is approved or final; say the brand's team will be in touch. Sign off as 'The franchise team'. " +
          'Reply as {"subject":"...","body":"..."}.\n\nFacts:\n' + facts,
      },
    ],
    { maxTokens: 900 },
  );
  return res ? Response.json({ available: true, ...res }) : Response.json({ available: false });
}
