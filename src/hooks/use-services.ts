"use client";
import { useEffect, useState } from "react";

export interface Services {
  ai: boolean;
  supabase: boolean;
  places: boolean;
  email: boolean;
}

let cached: Promise<Services> | null = null;
const OFF: Services = { ai: false, supabase: false, places: false, email: false };

export function fetchServices(): Promise<Services> {
  cached ??= fetch("/api/status")
    .then((r) => r.json())
    .catch(() => OFF);
  return cached;
}

/** Which optional services are configured on the server (true/false only). */
export function useServices(): Services | null {
  const [s, setS] = useState<Services | null>(null);
  useEffect(() => {
    fetchServices().then(setS);
  }, []);
  return s;
}
