import { z } from "zod";

// Sends a draft ONLY to the reviewer's own address (REVIEWER_EMAIL), never to the applicant.
// Requires RESEND_API_KEY and REVIEWER_EMAIL; otherwise the draft stays preview-only.
const Input = z.object({ subject: z.string().min(1).max(200), body: z.string().min(1).max(5000) });

export async function POST(req: Request) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.REVIEWER_EMAIL;
  if (!key || !to) return Response.json({ sent: false, message: "Preview only: no email provider configured." });
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ sent: false, message: "Nothing to send." });
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "onboarding@resend.dev",
        to: [to],
        subject: `[Test copy to reviewer] ${parsed.data.subject}`,
        text: parsed.data.body,
      }),
      signal: AbortSignal.timeout(15000),
    });
    return Response.json(res.ok ? { sent: true, message: "Sent to the reviewer's own address only." } : { sent: false, message: "The email provider refused the message." });
  } catch {
    return Response.json({ sent: false, message: "The email provider did not respond." });
  }
}
