"use client";
// Subtle GSAP motion: count-up numbers and staggered fade-in lists.
// Both switch off for people who prefer reduced motion.
import { useEffect, useRef } from "react";
import gsap from "gsap";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced()) {
      el.textContent = String(value);
      from.current = value;
      return;
    }
    const obj = { n: from.current };
    const tween = gsap.to(obj, { n: value, duration: 0.8, ease: "power2.out", onUpdate: () => { el.textContent = String(Math.round(obj.n)); } });
    from.current = value;
    return () => {
      tween.kill();
      el.textContent = String(value);
    };
  }, [value]);
  return <span ref={ref} className={className}>{value}</span>;
}

/** Fades and lifts the direct children of the returned ref in sequence when `key` changes. */
export function useStaggerIn<T extends HTMLElement>(key: unknown) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!ref.current || reduced()) return;
    const ctx = gsap.context(() => {
      gsap.from(ref.current!.children, { opacity: 0, y: 8, duration: 0.35, ease: "power2.out", stagger: 0.03, clearProps: "opacity,transform" });
    }, ref);
    return () => ctx.revert();
  }, [key]);
  return ref;
}
