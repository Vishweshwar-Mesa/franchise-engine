import "server-only";

// A small per-visitor limit on the paid AI routes, so one visitor cannot run up the bill.
// Over the limit the route answers "not available" and the page falls back to templates;
// the site itself is never blocked. Per server instance (good enough for a demo).
const hits = new Map<string, number[]>();

export function allow(req: Request, bucket: string, perMinute: number): boolean {
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= perMinute) return false;
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}
