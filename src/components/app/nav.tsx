"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useResults } from "@/hooks/use-results";
import { useWorkspace } from "@/store/workspace";
import { ThemeToggle } from "./theme-toggle";

const LINKS = [
  ["/", "Upload"],
  ["/results", "Results"],
  ["/territories", "Territories"],
  ["/contested", "Contested pins"],
  ["/onboarding", "Onboarding"],
  ["/settings", "Settings"],
  ["/activity", "Activity log"],
] as const;

/** Floating dark sidebar. Stacks above the content on narrow screens. */
export function Nav() {
  const path = usePathname();
  const r = useResults();
  const onboarding = useWorkspace((s) => Object.keys(s.onboarding).length);
  const counts: Record<string, number | undefined> = {
    "/results": r?.order.length,
    "/territories": r?.territories.length,
    "/contested": r?.contests.filter((c) => !c.decision?.winnerId).length,
    "/onboarding": onboarding || undefined,
  };
  return (
    <aside className="flex w-full flex-col gap-1 rounded-3xl bg-sidebar p-4 text-sidebar-foreground md:sticky md:top-4 md:h-[calc(100vh-2rem)] md:w-60 md:shrink-0">
      <div className="flex flex-col gap-0.5 px-2.5 pb-5">
        <span className="font-serif text-2xl font-bold tracking-tight">Franchise</span>
        <span className="text-xs text-[#B9B4AC]">Partner engine · Go Colors</span>
      </div>
      <nav className="flex flex-row flex-wrap gap-1 md:flex-col">
        {LINKS.map(([href, label]) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-[#D6D1C8] hover:bg-sidebar-accent",
              )}
            >
              {label}
              {counts[href] ? <span className={cn("text-xs", active ? "text-[#615A52]" : "text-[#B9B4AC]")}>{counts[href]}</span> : null}
            </Link>
          );
        })}
      </nav>
      <div className="mt-4 flex flex-col gap-3 md:mt-auto">
        <p className="rounded-2xl bg-sidebar-accent p-3 text-xs leading-relaxed text-[#D6D1C8]">
          Scenario: Go Colors (Go Fashion (India) Ltd) scaling through franchise partners. Go Colors has not published India franchise terms. Every status is a recommendation; a human confirms.
        </p>
        <ThemeToggle className="border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent" />
      </div>
    </aside>
  );
}
