"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Snapshot {
  available: boolean;
  reason?: string;
  radiusMeters?: number;
  fetchedAt?: string;
  counts?: Record<string, { count: number; capped: boolean }>;
  restaurants?: { byPrice: Record<string, number>; byRating: Record<string, number> };
  note?: string;
}
const LABEL: Record<string, string> = { schools: "Schools", colleges: "Colleges / universities", stores: "Stores", competitors: "Competitors (other clothing stores)", restaurants: "Restaurants" };

/** Reference only, never scored. Shows only counts returned by Google Places. */
export function AreaSnapshot({ pin, city }: { pin: string; city: string }) {
  const [s, setS] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    try {
      setS(await (await fetch(`/api/area?pin=${encodeURIComponent(pin)}&city=${encodeURIComponent(city)}`)).json());
    } catch {
      setS({ available: false, reason: "not available" });
    }
    setBusy(false);
  }
  const fmt = (o: Record<string, number>) => Object.entries(o).map(([k, v]) => `${k}: ${v}`).join(", ") || "none";
  return (
    <div className="space-y-2 rounded-[20px] border bg-card p-5 text-sm">
      <h3 className="text-base font-semibold">Area snapshot for pin {pin}</h3>
      <p className="text-xs text-[var(--tone-info)]">Reference only, not used in decisions.</p>
      <Button size="sm" variant="outline" disabled={busy} onClick={load}>{busy ? "Looking up…" : s ? "Refresh" : "Get area snapshot"}</Button>
      {s && !s.available && <p className="text-xs">Area data: {s.reason ?? "not available"}</p>}
      {s?.available && s.counts && (
        <div className="space-y-1 text-xs">
          <p>Within {s.radiusMeters} m of the pin&apos;s location (Google Places):</p>
          <ul className="ml-5 list-disc">
            {Object.entries(s.counts).map(([k, v]) => <li key={k}>{LABEL[k] ?? k}: {v.count}{v.capped ? "+" : ""}</li>)}
          </ul>
          {s.restaurants && <p>Restaurants by price level: {fmt(s.restaurants.byPrice)}. By rating: {fmt(s.restaurants.byRating)}.</p>}
          <p className="text-muted-foreground">{s.note} Fetched {s.fetchedAt ? new Date(s.fetchedAt).toLocaleString() : ""}.</p>
        </div>
      )}
    </div>
  );
}
