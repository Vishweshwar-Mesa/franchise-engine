import { z } from "zod";
import { db, isSessionId } from "@/lib/server/db";

// Records a franchisee account in Neon. There is no login system: judges and reviewers
// use "Preview as franchisee", which needs no login. No email is sent.
const Input = z.object({ email: z.string().email().max(200), appId: z.string().max(40), name: z.string().max(200), session: z.string() });

export async function POST(req: Request) {
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isSessionId(parsed.data.session)) return Response.json({ status: "error", message: "Enter a valid email address." });
  const sql = db();
  if (!sql) return Response.json({ status: "not-created", message: "Not saved: the database is not configured. Use 'Preview as franchisee'." });
  const { session, appId, email, name } = parsed.data;
  try {
    await sql.transaction([
      sql`insert into sessions (id) values (${session}) on conflict (id) do nothing`,
      sql`insert into franchisee_accounts (session_id, app_id, email, name) values (${session}, ${appId}, ${email}, ${name})
          on conflict (session_id, app_id) do update set email = excluded.email, name = excluded.name`,
    ]);
    return Response.json({ status: "created", message: "Franchisee account recorded. No email was sent; the franchisee view is the no-login preview." });
  } catch {
    return Response.json({ status: "error", message: "Not saved: the database did not respond." });
  }
}
