import { supabaseAdmin, isSessionId } from "@/lib/server/supabase";

// Stores a paperwork document in the private Supabase Storage bucket "paperwork".
// Without Supabase, answers { stored: false } and the browser keeps only the file name.
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  const db = supabaseAdmin();
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const session = form?.get("session");
  const appId = String(form?.get("appId") ?? "").replace(/[^A-Za-z0-9-]/g, "");
  const item = String(form?.get("item") ?? "").replace(/[^a-z]/g, "");
  if (!db) return Response.json({ stored: false, message: "File not stored: Supabase is not configured. Only the file name is kept." });
  if (!(file instanceof File) || !isSessionId(session) || !appId || !item) return Response.json({ stored: false, message: "Upload rejected: missing data." });
  if (file.size > MAX_BYTES) return Response.json({ stored: false, message: "File is larger than 10 MB." });
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-100);
  const path = `${session}/${appId}/${item}-${Date.now()}-${safeName}`;
  try {
    const { error } = await db.storage.from("paperwork").upload(path, file, { contentType: file.type || "application/octet-stream" });
    if (error) return Response.json({ stored: false, message: "Upload failed; only the file name is kept." });
    return Response.json({ stored: true, path, message: "Stored in Supabase Storage (private)." });
  } catch {
    return Response.json({ stored: false, message: "Upload failed; only the file name is kept." });
  }
}
