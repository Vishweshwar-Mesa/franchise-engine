"use client";
// Home: the Go Colors welcome page (inspired by a "brand reveal" intro: glossy colour orbs burst
// apart and the wordmark pops in). Uses the brand's accent colours from gocolors.com and a typeset
// wordmark, not the company's logo file: this is a hackathon scenario, not an official product.
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Baloo_2 } from "next/font/google";
import gsap from "gsap";

const baloo = Baloo_2({ subsets: ["latin"], weight: ["700", "800"] });

/** Accent colours used on gocolors.com. */
const BRAND = [
  { hex: "#DF2E84", name: "Magenta" },
  { hex: "#FC007E", name: "Hot pink" },
  { hex: "#FF156D", name: "Rose" },
  { hex: "#FF5924", name: "Orange" },
  { hex: "#FEA203", name: "Amber" },
  { hex: "#F6CA41", name: "Sun" },
];
const ORB_COLORS = ["#DF2E84", "#FC007E", "#FF156D", "#FF5924", "#FEA203", "#F6CA41", "#7C3AED", "#B91C1C"];

// Fixed layout (so server and browser render the same): x/y in % of the viewport, size in px.
const ORBS = Array.from({ length: 30 }, (_, i) => {
  const a = (i * 137.5 * Math.PI) / 180;
  const r = 18 + ((i * 53) % 34);
  return {
    x: 50 + Math.cos(a) * r * 1.25,
    y: 50 + Math.sin(a) * r * 0.95,
    size: 18 + ((i * 41) % 130),
    color: ORB_COLORS[i % ORB_COLORS.length],
    blur: i % 7 === 0,
  };
});

const WORD = "go colors";
const STEPS = [
  ["Upload", "Drop in the applications and territories file. Every row is checked: missing data, wrong pins, contradictions."],
  ["Review", "Each applicant gets a recommendation with the reasons: one store per pin, territory slots, a score you can read at a glance."],
  ["Onboard", "Confirmed partners move through paperwork, a Gantt plan and training to opening day, with check-ins after."],
];

export default function HomePage() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!root.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.from(".orb", {
        left: "50%", top: "45%", scale: 0.2, opacity: 0,
        duration: 1.6, ease: "expo.out", stagger: { each: 0.025, from: "random" },
      })
        .from(".wm-letter", { y: 60, scale: 0.4, opacity: 0, rotate: () => gsap.utils.random(-25, 25), duration: 0.9, ease: "elastic.out(1, 0.5)", stagger: 0.06 }, "-=1.1")
        .from(".reveal", { y: 18, opacity: 0, duration: 0.6, ease: "power2.out", stagger: 0.08 }, "-=0.5");
      gsap.utils.toArray<HTMLElement>(".orb").forEach((el, i) => {
        gsap.to(el, { y: gsap.utils.random(-26, 26), x: gsap.utils.random(-18, 18), duration: gsap.utils.random(3, 6), ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1.6 + i * 0.02 });
      });
      gsap.to(".wm-letter", { y: -6, duration: 1.8, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: { each: 0.15, from: "start" }, delay: 2.4 });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="fixed inset-0 z-30 overflow-x-hidden overflow-y-auto bg-[#141016] text-[#FAF9F6]">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        {ORBS.map((o, i) => (
          <span
            key={i}
            className="orb absolute rounded-full"
            style={{
              left: `${o.x}%`, top: `${o.y}%`, width: o.size, height: o.size, marginLeft: -o.size / 2, marginTop: -o.size / 2,
              background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.9) 0%, ${o.color} 22%, ${o.color}cc 48%, #1a0b16 100%)`,
              boxShadow: `0 0 ${o.size / 2}px ${o.color}55`,
              filter: o.blur ? "blur(3px)" : undefined,
              opacity: 0.9,
            }}
          />
        ))}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(20,16,22,0.55)_55%,#141016_85%)]" />
      </div>

      <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <header className="reveal flex items-center justify-between gap-4 text-sm">
          <span className="font-semibold tracking-wide text-white/80">Franchise Partner Engine</span>
          <nav className="flex gap-1">
            <Link href="/guide" className="rounded-full px-3 py-2 text-white/75 hover:text-white">How it works</Link>
            <Link href="/upload" className="rounded-full px-3 py-2 text-white/75 hover:text-white">Upload</Link>
          </nav>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center gap-6 py-16 text-center">
          <h1 className={`${baloo.className} flex flex-wrap justify-center text-[clamp(4.5rem,15vw,11rem)] leading-[0.9] font-extrabold tracking-tight`} aria-label="go colors">
            {WORD.split("").map((ch, i) =>
              ch === " " ? (
                <span key={i} className="w-[0.3em]" />
              ) : (
                <span
                  key={i}
                  aria-hidden="true"
                  className="wm-letter inline-block"
                  style={{
                    color: BRAND[i % BRAND.length].hex,
                    textShadow: `0 0.04em 0 rgba(0,0,0,0.25), 0 0 0.35em ${BRAND[i % BRAND.length].hex}66`,
                  }}
                >
                  {ch}
                </span>
              ),
            )}
          </h1>
          <p className="reveal text-2xl font-semibold tracking-tight md:text-3xl">Franchise Partner Engine</p>
          <p className="reveal max-w-xl text-base text-white/75 md:text-lg">
            From a partner&apos;s first application to an open, trained store: checked, explained and tracked in one place.
          </p>
          <div className="reveal flex flex-wrap justify-center gap-3 pt-2">
            <Link href="/today" className="rounded-full bg-[#C9246F] px-7 py-3.5 text-base font-semibold text-white shadow-[0_10px_40px_-10px_#DF2E84] transition hover:-translate-y-0.5 hover:bg-[#DF2E84]">
              Open the review desk →
            </Link>
            <Link href="/upload" className="rounded-full border border-white/25 px-7 py-3.5 text-base font-semibold text-white backdrop-blur transition hover:bg-white/10">
              Upload applications
            </Link>
          </div>
        </section>

        <section className="reveal grid gap-3 pb-8 md:grid-cols-3">
          {STEPS.map(([title, text], i) => (
            <div key={title} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-md">
              <p className="text-sm font-semibold" style={{ color: BRAND[i * 2].hex }}>0{i + 1}</p>
              <p className="mt-1 text-lg font-semibold">{title}</p>
              <p className="mt-1 text-sm text-white/70">{text}</p>
            </div>
          ))}
        </section>

        <footer className="reveal flex flex-col gap-4 border-t border-white/10 pt-6 pb-2 text-xs text-white/60 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1">Brand colours</span>
            {BRAND.map((c) => (
              <span key={c.hex} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-1 pr-2.5 pl-1">
                <span className="size-4 rounded-full" style={{ background: c.hex }} />
                <span className="font-mono">{c.hex}</span>
              </span>
            ))}
          </div>
          <p className="max-w-md md:text-right">
            MESA Ops Hackathon, Case 1 · Namratha Reddy &amp; Vishweshwar. A scenario of Go Colors (Go Fashion (India) Ltd) scaling through franchise partners; not affiliated with or endorsed by the company.
          </p>
        </footer>
      </main>
    </div>
  );
}
