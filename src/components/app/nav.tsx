"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useResults } from "@/hooks/use-results";
import { useWorkspace } from "@/store/workspace";
import { ThemeToggle } from "./theme-toggle";

const LINKS = [
  ["/", "Today"],
  ["/results", "Applicants"],
  ["/territories", "Territories"],
  ["/contested", "Contested"],
  ["/onboarding", "Onboarding"],
  ["/settings", "Settings"],
  ["/activity", "Activity"],
  ["/guide", "Guide"],
] as const;

/** Top navigation bar (V5 Bento Command Center). Wraps on narrow screens. */
export function Nav() {
  const path = usePathname();
  const r = useResults();
  const onboarding = useWorkspace((s) => Object.keys(s.onboarding).length);
  const counts: Record<string, number | undefined> = {
    "/results": r?.order.length,
    "/contested": r?.contests.filter((c) => !c.decision?.winnerId).length || undefined,
    "/onboarding": onboarding || undefined,
  };
  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-4 md:px-8">
      <Link href="/" className="mr-3 flex items-center gap-2.5 text-base font-bold">
        <span aria-hidden="true" className="size-[22px] rounded-[7px] bg-[#DF2E84]" />
        Franchise Engine
      </Link>
      <nav className="flex flex-wrap gap-0.5">
        {LINKS.map(([href, label]) => {
          const active =
            href === "/" ? path === "/"
            : href === "/results" ? path.startsWith("/results") || path.startsWith("/applicant")
            : href === "/onboarding" ? path.startsWith("/onboarding") || path.startsWith("/franchisee")
            : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn("flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors", active ? "bg-card text-foreground shadow-[inset_0_0_0_1px_var(--border)]" : "text-muted-foreground hover:text-foreground")}
            >
              {label}
              {counts[href] ? <span className="rounded-md bg-inset px-1.5 text-[11px] text-muted-foreground">{counts[href]}</span> : null}
            </Link>
          );
        })}
      </nav>
      <span className="flex-1" />
      <Link href="/upload" className={cn("h-10 rounded-[10px] border px-3.5 text-sm leading-10 font-semibold transition-colors hover:bg-muted", path === "/upload" && "bg-card")}>Upload file</Link>
      <ThemeToggle className="h-10 rounded-[10px]" />
    </header>
  );
}
