"use client";
import { usePathname } from "next/navigation";

/** The four colours of the Go Colors logo's "!", as a thin bar across the top of every page. */
export function BrandStripe() {
  const path = usePathname();
  if (path === "/") return null;
  return (
    <div aria-hidden="true" className="flex h-1.5">
      <span className="flex-1 bg-[var(--stripe-pink)]" />
      <span className="flex-1 bg-[var(--stripe-blue)]" />
      <span className="flex-1 bg-[var(--stripe-yellow)]" />
      <span className="flex-1 bg-[var(--stripe-green)]" />
    </div>
  );
}
