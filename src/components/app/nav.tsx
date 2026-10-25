"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useResults } from "@/hooks/use-results";

const LINKS = [
  ["/", "Upload"],
  ["/results", "Results"],
  ["/territories", "Territories"],
  ["/contested", "Contested pins"],
  ["/settings", "Settings"],
  ["/activity", "Activity log"],
] as const;

export function Nav() {
  const path = usePathname();
  const r = useResults();
  const contested = r?.contests.filter((c) => !c.decision?.winnerId).length ?? 0;
  return (
    <nav className="flex flex-wrap items-center gap-1 border-b px-4 py-2">
      <span className="mr-3 font-semibold">Franchise Partner Engine</span>
      {LINKS.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className={cn("rounded-md px-2 py-1 text-sm hover:bg-muted", (href === "/" ? path === "/" : path.startsWith(href)) && "bg-muted font-medium")}
        >
          {label}
          {href === "/contested" && contested > 0 && <span className="ml-1 rounded bg-purple-200 px-1 text-xs">{contested}</span>}
        </Link>
      ))}
    </nav>
  );
}
