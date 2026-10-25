import type { NextRequest } from "next/server";
import { db } from "@/lib/server/db";

// Area snapshot for a pin code: counts of nearby places from Google Places (New).
// Reference only, never used in decisions. Only counts the API returns are shown.
// Geocode first and check it lands in the applicant's city, else "not available".
// Cached per pin (Neon, else memory); hard daily cap on Google calls; fails soft.

const RADIUS_M = 1500;
const DAILY_CAP = Number(process.env.PLACES_DAILY_CAP) > 0 ? Number(process.env.PLACES_DAILY_CAP) : 300;
const CATEGORIES: Record<string, string[]> = {
  schools: ["school", "primary_school", "secondary_school"],
  colleges: ["university"],
  stores: ["store"],
  competitors: ["clothing_store"],
  restaurants: ["restaurant"],
};
// Older and newer official names, so the geocode check accepts either spelling.
const CITY_NAMES: Record<string, string[]> = {
  bengaluru: ["bengaluru", "bangalore"],
  mysuru: ["mysuru", "mysore"],
  mangaluru: ["mangaluru", "mangalore", "dakshina kannada"],
  "hubballi-dharwad": ["hubballi", "hubli", "dharwad"],
  belagavi: ["belagavi", "belgaum"],
  tumakuru: ["tumakuru", "tumkur"],
  davanagere: ["davanagere", "davangere"],
};

const memCache = new Map<string, unknown>();
const memUsage = { day: "", calls: 0 };

async function takeQuota(n: number): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  const sql = db();
  if (sql) {
    try {
      const rows = await sql`insert into places_usage (day, calls) values (${day}, ${n})
        on conflict (day) do update set calls = places_usage.calls + excluded.calls returning calls`;
      return Number(rows[0].calls) <= DAILY_CAP;
    } catch {
      /* fall back to the in-memory counter */
    }
  }
  if (memUsage.day !== day) Object.assign(memUsage, { day, calls: 0 });
  memUsage.calls += n;
  return memUsage.calls <= DAILY_CAP;
}

const na = (reason: string) => Response.json({ available: false, reason });

export async function GET(req: NextRequest) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  const pin = req.nextUrl.searchParams.get("pin") ?? "";
  const city = (req.nextUrl.searchParams.get("city") ?? "").trim();
  if (!key) return na("not available (Google Maps key not configured)");
  if (!/^\d{6}$/.test(pin)) return na("not available (pin is not 6 digits)");

  const cacheKey = `${pin}|${city.toLowerCase()}`;
  const sql = db();
  try {
    if (memCache.has(cacheKey)) return Response.json(memCache.get(cacheKey));
    if (sql) {
      const rows = await sql`select data from area_cache where key = ${cacheKey}`;
      if (rows[0]) return Response.json(rows[0].data);
    }
    // Charge the daily cap per Google call actually made: 1 geocode now, the Places searches later.
    if (!(await takeQuota(1))) return na("not available (daily lookup limit reached; try tomorrow)");
    // Answers that will not change (pin not found, wrong city) are cached too, so they cost nothing next time.
    const remember = async (reason: string) => {
      const out = { available: false, reason };
      memCache.set(cacheKey, out);
      try {
        if (sql) await sql`insert into area_cache (key, data) values (${cacheKey}, ${JSON.stringify(out)}::jsonb) on conflict (key) do update set data = excluded.data, fetched_at = now()`;
      } catch {
        /* cache is best effort */
      }
      return Response.json(out);
    };

    const geo = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?components=${encodeURIComponent(`postal_code:${pin}|country:IN`)}&key=${key}`,
      { signal: AbortSignal.timeout(10000) },
    ).then((r) => r.json());
    const first = geo?.results?.[0];
    if (!first) return remember("not available (pin could not be located)");
    const names: string[] = (first.address_components ?? []).map((c: { long_name: string }) => c.long_name.toLowerCase());
    const wanted = CITY_NAMES[city.toLowerCase()] ?? [city.toLowerCase()];
    if (!city || !names.some((n) => wanted.some((w) => n.includes(w)))) {
      return remember(`not available (the pin's location does not match ${city || "the city"})`);
    }
    if (!(await takeQuota(Object.keys(CATEGORIES).length))) return na("not available (daily lookup limit reached; try tomorrow)");
    const { lat, lng } = first.geometry.location;

    const counts: Record<string, { count: number; capped: boolean }> = {};
    let restaurants: { priceLevel?: string; rating?: number }[] = [];
    for (const [cat, types] of Object.entries(CATEGORIES)) {
      const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": cat === "restaurants" ? "places.id,places.priceLevel,places.rating" : "places.id",
        },
        body: JSON.stringify({ includedTypes: types, maxResultCount: 20, locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: RADIUS_M } } }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return na("not available (Places API error)");
      const places = (await res.json()).places ?? [];
      counts[cat] = { count: places.length, capped: places.length >= 20 };
      if (cat === "restaurants") restaurants = places;
    }
    const byPrice: Record<string, number> = {};
    const byRating: Record<string, number> = {};
    for (const r of restaurants) {
      const p = (r.priceLevel ?? "PRICE_LEVEL_UNSPECIFIED").replace("PRICE_LEVEL_", "").toLowerCase().replace(/_/g, " ");
      byPrice[p] = (byPrice[p] ?? 0) + 1;
      const band = r.rating === undefined ? "no rating" : r.rating >= 4.5 ? "4.5+" : r.rating >= 4 ? "4.0-4.4" : "under 4.0";
      byRating[band] = (byRating[band] ?? 0) + 1;
    }
    const out = {
      available: true, pin, city, radiusMeters: RADIUS_M, fetchedAt: new Date().toISOString(),
      counts, restaurants: { byPrice, byRating },
      note: "Counts of places returned by Google Places within the radius; each search returns at most 20, shown as 20+. Reference only, not used in decisions.",
    };
    memCache.set(cacheKey, out);
    if (sql) await sql`insert into area_cache (key, data) values (${cacheKey}, ${JSON.stringify(out)}::jsonb) on conflict (key) do update set data = excluded.data, fetched_at = now()`;
    return Response.json(out);
  } catch {
    return na("not available (lookup failed)");
  }
}
