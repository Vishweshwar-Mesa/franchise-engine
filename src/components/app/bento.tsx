"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Pointer position -> CSS vars, so the .tile glow (globals.css) follows the mouse. */
function track(e: React.PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
}

/** A bento tile. With `href` the whole tile is a link. */
export function Tile({ title, aside, href, className, children }: { title?: React.ReactNode; aside?: React.ReactNode; href?: string; className?: string; children: React.ReactNode }) {
  const body = (
    <>
      {(title || aside) && (
        <div className="flex items-center justify-between gap-3">
          {title && <span className="text-[13px] font-medium text-muted-foreground">{title}</span>}
          {aside}
        </div>
      )}
      {children}
    </>
  );
  const cls = cn("tile flex flex-col gap-3 rounded-[20px] border bg-card p-5 text-sm", className);
  return href ? (
    <Link href={href} onPointerMove={track} className={cn(cls, "outline-none focus-visible:ring-2 focus-visible:ring-ring")}>{body}</Link>
  ) : (
    <section onPointerMove={track} className={cls}>{body}</section>
  );
}
