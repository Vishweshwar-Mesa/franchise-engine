import { z } from "zod";
import { supabaseAdmin } from "@/lib/server/supabase";

// Creates a franchisee user in Supabase Auth (admin API, no email is sent).
// Judges never need it: "Preview as franchisee" opens the view without any login.
const Input = z.object({ email: z.string().email().max(200), appId: z.string().max(40), name: z.string().max(200) });

export async function POST(req: Request) {
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ status: "error", message: "Enter a valid email address." });
  const db = supabaseAdmin();
  if (!db) return Response.json({ status: "not-created", message: "Not created: Supabase is not configured. Use 'Preview as franchisee'." });
  try {
    const { error } = await db.auth.admin.createUser({
      email: parsed.data.email,
      email_confirm: false,
      user_metadata: { role: "franchisee", application_id: parsed.data.appId, name: parsed.data.name },
    });
    if (error) return Response.json({ status: "error", message: `Not created: ${error.message}` });
    return Response.json({ status: "created", message: "Franchisee account created in Supabase Auth. No email was sent." });
  } catch {
    return Response.json({ status: "error", message: "Not created: Supabase Auth did not respond." });
  }
}
