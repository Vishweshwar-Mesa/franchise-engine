"use client";
// Opening animation on the welcome page: glossy orbs in the four colours of the Go Colors "!"
// swirl, burst apart and reveal the logo, then the page shows. Once per browser session; any
// click or key skips it; skipped entirely for people who prefer reduced motion.
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const COLORS = ["#F04898", "#1878B8", "#FFC028", "#90C840"];
const ORBS = Array.from({ length: 26 }, (_, i) => {
  const a = (i * 137.5 * Math.PI) / 180;
  const r = 6 + ((i * 29) % 22);
  return { x: Math.cos(a) * r, y: Math.sin(a) * r, size: 26 + ((i * 37) % 86), color: COLORS[i % 4], angle: a };
});
const KEY = "gc-intro-seen";

function shouldPlay() {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    return sessionStorage.getItem(KEY) !== "1";
  } catch {
    return false;
  }
}

export function BrandIntro() {
  // The app renders only in the browser (see Providers), so reading storage here is safe.
  const [show, setShow] = useState(shouldPlay);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show || !root.current) return;
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
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
              background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95) 0%, ${o.color} 24%, ${o.color} 55%, color-mix(in oklab, ${o.color} 55%, black) 100%)`,
              boxShadow: `0 10px 30px -8px ${o.color}88`,
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
