"use client";
// Opening animation on the welcome page: soft glass orbs, each a gradient of two of the four
// Go Colors "!" colours, swirl and drift apart to reveal the logo, then the page shows. Plays on every
// load of the welcome page; any click or key skips it; skipped for people who prefer reduced motion.
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const COLORS = ["#F04898", "#1878B8", "#FFC028", "#90C840"];
/** Each orb blends two of the logo colours. */
const PAIRS: [string, string][] = [
  ["#F04898", "#1878B8"], ["#1878B8", "#90C840"], ["#FFC028", "#F04898"], ["#90C840", "#FFC028"], ["#F04898", "#FFC028"], ["#1878B8", "#F04898"],
];
// Fewer, larger orbs at three depths: far ones are smaller, softer and blurred.
const ORBS = Array.from({ length: 16 }, (_, i) => {
  const a = (i * 137.5 * Math.PI) / 180;
  const r = 8 + ((i * 29) % 20);
  const depth = i % 3; // 0 near, 1 mid, 2 far
  return {
    x: Math.cos(a) * r, y: Math.sin(a) * r * 0.85, angle: a, depth,
    size: [150, 96, 58][depth] + ((i * 23) % 40),
    pair: PAIRS[i % PAIRS.length],
  };
});
function shouldPlay() {
  try {
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return true;
  }
}

export function BrandIntro() {
  // The app renders only in the browser (see Providers), so reading storage here is safe.
  const [show, setShow] = useState(shouldPlay);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show || !root.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: () => setShow(false) });
      tl.from(".io-orb", { scale: 0, opacity: 0, duration: 0.5, ease: "back.out(2)", stagger: { each: 0.015, from: "center" } })
        .to(".io-swirl", { rotate: 200, duration: 1.1, ease: "power2.inOut" }, "-=0.2")
        .to(".io-orb", {
          x: (i) => Math.cos(ORBS[i].angle) * window.innerWidth * 0.7,
          y: (i) => Math.sin(ORBS[i].angle) * window.innerHeight * 0.7,
          scale: 1.6, opacity: 0, duration: 0.8, ease: "power3.in", stagger: { each: 0.008, from: "center" },
        }, "-=0.25")
        .from(".io-logo", { scale: 0.6, opacity: 0, duration: 0.6, ease: "back.out(1.8)" }, "-=0.55")
        .from(".io-stripe span", { scaleX: 0, transformOrigin: "left center", duration: 0.35, stagger: 0.06 }, "-=0.3")
        .to({}, { duration: 0.45 })
        .to(root.current, { opacity: 0, duration: 0.45, ease: "power1.out" });
    }, root);
    const skip = () => setShow(false);
    window.addEventListener("keydown", skip, { once: true });
    return () => {
      window.removeEventListener("keydown", skip);
      ctx.revert();
    };
  }, [show]);

  if (!show) return null;
  return (
    <div ref={root} onClick={() => setShow(false)} role="presentation" className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center overflow-hidden bg-background">
      <div className="io-swirl relative size-0" aria-hidden="true">
        {ORBS.map((o, i) => (
          <span
            key={i}
            className="io-orb absolute rounded-full"
            style={{
              left: `${o.x}vmin`, top: `${o.y}vmin`, width: o.size, height: o.size, marginLeft: -o.size / 2, marginTop: -o.size / 2,
              // Soft glass: a faint top-left sheen over a two-colour gradient, shaded from inside.
              background: `radial-gradient(circle at 30% 24%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 42%), linear-gradient(140deg, ${o.pair[0]} 8%, ${o.pair[1]} 92%)`,
              boxShadow: `inset -12px -16px 32px rgba(20,10,30,0.22), inset 10px 12px 26px rgba(255,255,255,0.28), 0 24px 50px -22px ${o.pair[0]}aa`,
              filter: o.depth === 2 ? "blur(5px)" : o.depth === 1 ? "blur(1px)" : undefined,
              opacity: o.depth === 2 ? 0.6 : o.depth === 1 ? 0.85 : 0.95,
              zIndex: 3 - o.depth,
            }}
          />
        ))}
      </div>
      <div className="absolute flex flex-col items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/gocolors-logo.png" alt="Go Colors" className="io-logo h-16 w-auto md:h-24 dark:brightness-0 dark:invert" />
        <div className="io-stripe flex h-2 w-56 overflow-hidden rounded-full" aria-hidden="true">
          {COLORS.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}
        </div>
      </div>
      <button type="button" onClick={() => setShow(false)} className="absolute right-6 bottom-6 rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
        Skip
      </button>
    </div>
  );
}
