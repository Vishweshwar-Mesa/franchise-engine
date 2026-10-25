// Zod schemas for every AI response. Anything that does not validate is discarded.
import { z } from "zod";

export const AssessItem = z.object({
  id: z.string(),
  relevance: z.enum(["High", "Medium", "Low"]),
  reason: z.string().max(300),
  contradiction: z.object({ found: z.boolean(), detail: z.string().max(300) }),
});
export const AssessResponse = z.object({ results: z.array(AssessItem) });

export const ExplainResponse = z.object({
  summary: z.string().max(1200),
  nextSteps: z.array(z.string().max(300)).max(8),
  training: z.array(z.object({ module: z.string().max(200), why: z.string().max(300) })).max(8),
});

export const ChatResponse = z.object({
  answer: z.string().max(2000),
  whatIf: z
    .object({
      id: z.string(),
      changes: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
    })
    .nullable()
    .optional(),
});

export const EmailResponse = z.object({ subject: z.string().max(200), body: z.string().max(4000) });

export const ResearchResponse = z.object({
  links: z.array(z.object({ title: z.string().max(200), url: z.string().max(500), why: z.string().max(300) })).max(8),
});
