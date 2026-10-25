import { db, isSessionId } from "@/lib/server/db";
import type { NextRequest } from "next/server";

// Mirrors one browser session's workspace into Neon so the link keeps its state.
// Without DATABASE_URL both methods answer { enabled: false } and the browser copy is used.

type Row = Record<string, unknown>;

export async function GET(req: NextRequest) {
  const sql = db();
  const session = req.nextUrl.searchParams.get("session");
  if (!sql || !isSessionId(session)) return Response.json({ enabled: !!sql, found: false });
  try {
    const [ws, apps, ters, stores, actions] = await sql.transaction([
      sql`select * from workspace_state where session_id = ${session}`,
      sql`select data from applicants where session_id = ${session}`,
      sql`select data from territories where session_id = ${session}`,
      sql`select data from stores where session_id = ${session}`,
      sql`select at, kind, applicant_id, detail from reviewer_actions where session_id = ${session} order by at desc limit 500`,
    ]);
    const s = ws[0] as Row | undefined;
    if (!s) return Response.json({ enabled: true, found: false });
    const meta = (s.dataset_meta ?? {}) as Row;
    const byRow = (a: Row, b: Row) => Number(a.rowNumber ?? 0) - Number(b.rowNumber ?? 0);
    const dataset = meta.report
      ? {
          applications: apps.map((r) => r.data as Row).sort(byRow),
          territories: ters.map((r) => r.data as Row).sort(byRow),
          stores: stores.map((r) => r.data as Row),
          allowedCities: meta.allowedCities, languages: meta.languages, report: meta.report,
        }
      : null;
    return Response.json({
      enabled: true, found: true,
      data: {
        sessionId: session, dataset, settings: s.settings, reviewer: s.reviewer, ai: s.ai, explanations: s.explanations,
        contests: s.contests, waitlist: s.waitlist, onboarding: s.onboarding, updatedAt: s.updated_at,
        log: actions.map((a) => ({ at: a.at, kind: a.kind, applicantId: a.applicant_id ?? undefined, detail: a.detail })),
      },
    });
  } catch {
    return Response.json({ enabled: true, found: false, error: "Could not read saved state." });
  }
}

export async function POST(req: Request) {
  const sql = db();
  if (!sql) return Response.json({ enabled: false });
  const body = await req.json().catch(() => null);
  const session = body?.data?.sessionId;
  if (!isSessionId(session)) return Response.json({ enabled: true, ok: false });
  const d = body.data as Row;
  const dataset = d.dataset as Row | null;
  const json = (v: unknown) => JSON.stringify(v ?? null);
  const apps = (dataset?.applications ?? []) as Row[];
  const ters = (dataset?.territories ?? []) as Row[];
  const stores = ((dataset?.stores ?? []) as Row[]).map((s, i) => ({ ...s, id: String(s.id || `row-${i}`) }));
  const ledger = (body.ledger ?? []) as { app_id: string; status: string; entry: unknown }[];
  const log = ((d.log ?? []) as Row[]).slice(0, 500);
  const meta = dataset ? { allowedCities: dataset.allowedCities, languages: dataset.languages, report: dataset.report } : {};
  try {
    await sql.transaction([
      sql`insert into sessions (id) values (${session}) on conflict (id) do update set updated_at = now()`,
      sql`delete from applicants where session_id = ${session}`,
      sql`insert into applicants (session_id, app_id, data) select ${session}, x->>'id', x from jsonb_array_elements(${json(apps)}::jsonb) x`,
      sql`delete from territories where session_id = ${session}`,
      sql`insert into territories (session_id, territory_id, data) select ${session}, x->>'id', x from jsonb_array_elements(${json(ters)}::jsonb) x`,
      sql`delete from stores where session_id = ${session}`,
      sql`insert into stores (session_id, store_id, data) select ${session}, x->>'id', x from jsonb_array_elements(${json(stores)}::jsonb) x`,
      sql`delete from ledger where session_id = ${session}`,
      sql`insert into ledger (session_id, app_id, status, entry) select ${session}, x->>'app_id', x->>'status', x->'entry' from jsonb_array_elements(${json(ledger)}::jsonb) x`,
      sql`insert into workspace_state (session_id, settings, reviewer, ai, explanations, contests, waitlist, onboarding, dataset_meta, updated_at)
          values (${session}, ${json(d.settings ?? {})}::jsonb, ${json(d.reviewer ?? {})}::jsonb, ${json(d.ai ?? {})}::jsonb, ${json(d.explanations ?? {})}::jsonb,
                  ${json(d.contests ?? {})}::jsonb, ${json(d.waitlist ?? {})}::jsonb, ${json(d.onboarding ?? {})}::jsonb, ${json(meta)}::jsonb, now())
          on conflict (session_id) do update set settings = excluded.settings, reviewer = excluded.reviewer, ai = excluded.ai,
            explanations = excluded.explanations, contests = excluded.contests, waitlist = excluded.waitlist,
            onboarding = excluded.onboarding, dataset_meta = excluded.dataset_meta, updated_at = now()`,
      sql`insert into reviewer_actions (session_id, at, kind, applicant_id, detail)
          select ${session}, (x->>'at')::timestamptz, x->>'kind', x->>'applicantId', x->>'detail' from jsonb_array_elements(${json(log)}::jsonb) x
          on conflict do nothing`,
    ]);
    return Response.json({ enabled: true, ok: true });
  } catch {
    return Response.json({ enabled: true, ok: false });
  }
}
