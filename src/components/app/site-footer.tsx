"use client";
import { usePathname } from "next/navigation";

/** Scenario note under every app page (the home page has its own). */
export function SiteFooter() {
  const path = usePathname();
  if (path === "/" || path.startsWith("/franchisee")) return null;
  return (
    <footer className="px-4 pb-8 text-xs text-muted-foreground md:px-8">
      <p className="mx-auto max-w-7xl">
        Scenario: Go Colors (Go Fashion (India) Ltd) scaling through franchise partners. Go Colors has not published India franchise terms. Every status is a recommendation; a human confirms.
      </p>
    </footer>
  );
}
