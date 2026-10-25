import { supabaseAdmin, isSessionId } from "@/lib/server/supabase";
import type { NextRequest } from "next/server";

// Mirrors one browser session's workspace into Supabase so the link keeps its state.
// Without Supabase configured, both methods answer { enabled: false } and the browser copy is used.

type Row = Record<string, unknown>;

export async function GET(req: NextRequest) {
  const db = supabaseAdmin();
  const session = req.nextUrl.searchParams.get("session");
  if (!db || !isSessionId(session)) return Response.json({ enabled: !!db, found: false });
  try {
    const [ws, apps, ters, stores, actions] = await Promise.all([
      db.from("workspace_state").select("*").eq("session_id", session).maybeSingle(),
      db.from("applicants").select("data").eq("session_id", session),
      db.from("territories").select("data").eq("session_id", session),
      db.from("stores").select("data").eq("session_id", session),
      db.from("reviewer_actions").select("at, kind, applicant_id, detail").eq("session_id", session).order("at", { ascending: false }).limit(500),
    ]);
    if (!ws.data) return Response.json({ enabled: true, found: false });
    const s = ws.data as Row;
    const meta = (s.dataset_meta ?? {}) as Row;
    const byRow = (a: Row, b: Row) => Number(a.rowNumber ?? 0) - Number(b.rowNumber ?? 0);
    const dataset = meta.report
      ? {
          applications: (apps.data ?? []).map((r) => r.data as Row).sort(byRow),
          territories: (ters.data ?? []).map((r) => r.data as Row).sort(byRow),
          stores: (stores.data ?? []).map((r) => r.data as Row),
          allowedCities: meta.allowedCities, languages: meta.languages, report: meta.report,
        }
      : null;
    return Response.json({
      enabled: true, found: true,
      data: {
        sessionId: session, dataset, settings: s.settings, reviewer: s.reviewer, ai: s.ai, explanations: s.explanations,
        contests: s.contests, waitlist: s.waitlist, onboarding: s.onboarding, updatedAt: s.updated_at,
        log: (actions.data ?? []).map((a) => ({ at: a.at, kind: a.kind, applicantId: a.applicant_id ?? undefined, detail: a.detail })),
      },
    });
  } catch {
    return Response.json({ enabled: true, found: false, error: "Could not read saved state." });
  }
}

export async function POST(req: Request) {
  const db = supabaseAdmin();
  if (!db) return Response.json({ enabled: false });
  const body = await req.json().catch(() => null);
  const session = body?.data?.sessionId;
  if (!isSessionId(session)) return Response.json({ enabled: true, ok: false });
  const d = body.data as Row;
  const dataset = d.dataset as Row | null;
  const ledger = (body.ledger ?? []) as { app_id: string; status: string; entry: unknown }[];
  try {
    await db.from("sessions").upsert({ id: session, updated_at: new Date().toISOString() });
    const replace = async (table: string, rows: Row[]) => {
      await db.from(table).delete().eq("session_id", session);
      if (rows.length) await db.from(table).insert(rows);
    };
    const apps = ((dataset?.applications ?? []) as Row[]).map((a) => ({ session_id: session, app_id: a.id, data: a }));
    const ters = ((dataset?.territories ?? []) as Row[]).map((t) => ({ session_id: session, territory_id: t.id, data: t }));
    const stores = ((dataset?.stores ?? []) as Row[]).map((s, i) => ({ session_id: session, store_id: String(s.id || `row-${i}`), data: s }));
    await Promise.all([
      replace("applicants", apps),
      replace("territories", ters),
      replace("stores", stores),
      replace("ledger", ledger.map((l) => ({ session_id: session, ...l }))),
    ]);
    await db.from("workspace_state").upsert({
      session_id: session, settings: d.settings ?? {}, reviewer: d.reviewer ?? {}, ai: d.ai ?? {},
      explanations: d.explanations ?? {}, contests: d.contests ?? {}, waitlist: d.waitlist ?? {}, onboarding: d.onboarding ?? {},
      dataset_meta: dataset ? { allowedCities: dataset.allowedCities, languages: dataset.languages, report: dataset.report } : {},
      updated_at: new Date().toISOString(),
    });
    const log = ((d.log ?? []) as Row[]).slice(0, 500).map((l) => ({
      session_id: session, at: l.at, kind: l.kind, applicant_id: l.applicantId ?? null, detail: l.detail,
    }));
    if (log.length) await db.from("reviewer_actions").upsert(log, { onConflict: "session_id,at,kind", ignoreDuplicates: true });
    return Response.json({ enabled: true, ok: true });
  } catch {
    return Response.json({ enabled: true, ok: false });
  }
}
