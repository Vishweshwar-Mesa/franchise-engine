import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase";

// Area snapshot for a pin code: counts of nearby places from Google Places (New).
// Reference only, never used in decisions. Only counts the API returns are shown.
// Geocode first and check it lands in the applicant's city, else "not available".
// Cached per pin (Supabase, else memory); hard daily cap on Google calls; fails soft.

const RADIUS_M = 1500;
const DAILY_CAP = Number(process.env.PLACES_DAILY_CAP) > 0 ? Number(process.env.PLACES_DAILY_CAP) : 300;
const CATEGORIES: Record<string, string[]> = {
  schools: ["school", "primary_school", "secondary_school"],
  colleges: ["university"],
  stores: ["store"],
  competitors: ["clothing_store"],
  restaurants: ["restaurant"],
};
const CALLS_PER_LOOKUP = 1 + Object.keys(CATEGORIES).length;
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
  const db = supabaseAdmin();
  if (db) {
    const { data, error } = await db.rpc("bump_places_usage", { p_day: day, p_by: n });
    if (!error && typeof data === "number") return data <= DAILY_CAP;
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
  const db = supabaseAdmin();
  try {
    if (memCache.has(cacheKey)) return Response.json(memCache.get(cacheKey));
    if (db) {
      const { data } = await db.from("area_cache").select("data").eq("pin", cacheKey).maybeSingle();
      if (data) return Response.json(data.data);
    }
    if (!(await takeQuota(CALLS_PER_LOOKUP))) return na("not available (daily lookup limit reached; try tomorrow)");

    const geo = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?components=${encodeURIComponent(`postal_code:${pin}|country:IN`)}&key=${key}`,
      { signal: AbortSignal.timeout(10000) },
    ).then((r) => r.json());
    const first = geo?.results?.[0];
    if (!first) return na("not available (pin could not be located)");
    const names: string[] = (first.address_components ?? []).map((c: { long_name: string }) => c.long_name.toLowerCase());
    const wanted = CITY_NAMES[city.toLowerCase()] ?? [city.toLowerCase()];
    if (!city || !names.some((n) => wanted.some((w) => n.includes(w)))) {
      return na(`not available (the pin's location does not match ${city || "the city"})`);
    }
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
    if (db) await db.from("area_cache").upsert({ pin: cacheKey, data: out });
    return Response.json(out);
  } catch {
    return na("not available (lookup failed)");
  }
}
