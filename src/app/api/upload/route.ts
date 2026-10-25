import { put } from "@vercel/blob";
import { isSessionId } from "@/lib/server/db";

// Stores a paperwork document as a PRIVATE Vercel Blob. Without BLOB_READ_WRITE_TOKEN,
// answers { stored: false } and the browser keeps only the file name.
// Vercel limits request bodies to 4.5 MB.
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const session = form?.get("session");
  const appId = String(form?.get("appId") ?? "").replace(/[^A-Za-z0-9-]/g, "");
  const item = String(form?.get("item") ?? "").replace(/[^a-z]/g, "");
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ stored: false, message: "File not stored: file storage is not configured. Only the file name is kept." });
  if (!(file instanceof File) || !isSessionId(session) || !appId || !item) return Response.json({ stored: false, message: "Upload rejected: missing data." });
  if (file.size > MAX_BYTES) return Response.json({ stored: false, message: "File is larger than 4 MB (the hosting limit). Upload a smaller scan or PDF." });
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-100);
  try {
    const blob = await put(`paperwork/${session}/${appId}/${item}-${safeName}`, file, {
      access: "private",
      addRandomSuffix: true,
      contentType: file.type || "application/octet-stream",
    });
    return Response.json({ stored: true, path: blob.pathname, message: "Stored privately in Vercel Blob." });
  } catch {
    return Response.json({ stored: false, message: "Upload failed; only the file name is kept." });
  }
}
