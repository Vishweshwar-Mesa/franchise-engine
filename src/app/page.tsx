"use client";
// Home: the welcome page in Go Colors' own brand language, taken from gocolors.com:
// off-white #FAF9F6, ink #1A1A1A, Montserrat, condensed uppercase italic headlines, hot-pink
// #FC007E pill buttons, and the four-colour stripe of the logo's "!" (pink, blue, yellow, green),
// which the brand also prints on its shopping bags. Hackathon case study; not an official page.
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Barlow_Condensed, Montserrat } from "next/font/google";
import gsap from "gsap";
import { BrandIntro } from "@/components/app/brand-intro";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["500", "600", "700"] });
const condensed = Barlow_Condensed({ subsets: ["latin"], weight: ["700", "800"], style: ["italic", "normal"] });

/** The logo "!" colours, top to bottom, sampled from the brand's logo file. */
const STRIPE = [
  { hex: "#F04898", name: "Pink" },
  { hex: "#1878B8", name: "Blue" },
  { hex: "#FFC028", name: "Yellow" },
  { hex: "#90C840", name: "Green" },
];

const TILES = [
  { label: "Upload", text: "Add the applications and territories sheet. We check every row for missing details, wrong pin codes and answers that don't add up.", href: "/upload", color: STRIPE[0].hex },
  { label: "Review", text: "Each applicant gets a recommendation with the reasons behind it. Only one store per pin code, and only as many stores as a territory has room for.", href: "/today", color: STRIPE[1].hex },
  { label: "Onboard", text: "Once you approve a partner, track their paperwork, set-up and training on one plan, all the way to opening day.", href: "/onboarding", color: STRIPE[3].hex },
];

function Stripes({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col ${className}`} aria-hidden="true">
      {STRIPE.map((s) => <span key={s.hex} className="stripe block flex-1" style={{ background: s.hex }} />)}
    </div>
  );
}

export default function HomePage() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!root.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.timeline()
        .from(".bag", { y: 40, rotate: -6, opacity: 0, duration: 0.9, ease: "power3.out" })
        .from(".bag .stripe", { scaleX: 0, transformOrigin: "left center", duration: 0.5, ease: "power2.out", stagger: 0.08 }, "-=0.5")
        .from(".rise", { y: 24, opacity: 0, duration: 0.6, ease: "power2.out", stagger: 0.08 }, "-=0.9");
      gsap.to(".bag", { y: -8, duration: 2.6, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1.2 });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <>
    <BrandIntro />
    <div ref={root} className={`${montserrat.className} fixed inset-0 z-30 overflow-x-hidden overflow-y-auto bg-background text-foreground`}>
      <Stripes className="h-1.5 flex-row [&>span]:h-full" />

      <header className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5 md:px-10">
        <Link href="/" aria-label="Go Colors Franchise Engine, home" className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/gocolors-logo.png" alt="Go Colors" className="h-8 w-auto md:h-9 dark:brightness-0 dark:invert" />
          <span className="hidden border-l border-foreground/15 pl-4 text-[13px] font-semibold tracking-[0.06em] text-foreground/70 uppercase sm:inline">Franchise Engine</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link href="/guide" className="rounded-full px-3 py-2 text-foreground/75 hover:text-foreground">How it works</Link>
          <Link href="/today" className="rounded-full bg-foreground px-4 py-2 text-background hover:opacity-90">Review desk</Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-6 pt-6 pb-14 md:grid-cols-[1.1fr_0.9fr] md:px-10 md:pt-12">
        <div className="flex flex-col gap-6">
          <p className="rise text-xs font-semibold tracking-[0.18em] text-[#FC007E] uppercase">Franchise expansion</p>
          <h1 className={`${condensed.className} rise text-[clamp(3.2rem,8vw,6.5rem)] leading-[0.88] font-extrabold tracking-tight uppercase italic`}>
            From application<br />to open store
          </h1>
          <p className="rise max-w-lg text-[17px] leading-relaxed text-foreground/75">
            Upload the applications and see who can move forward, who is on hold and why. Then follow each new partner through paperwork and training until the store opens.
          </p>
          <div className="rise flex flex-wrap gap-3">
            <Link href="/today" className="rounded-full bg-[#E0006F] px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_24px_-8px_#FC007E] transition hover:-translate-y-0.5 hover:bg-[#C2005F]">
              Open the review desk
            </Link>
            <Link href="/upload" className="rounded-full border border-foreground px-7 py-3.5 text-[15px] font-semibold transition hover:bg-foreground hover:text-background">
              Upload applications
            </Link>
          </div>
        </div>

        <div className="relative mx-auto flex w-full max-w-sm justify-center md:max-w-md">
          {/* The brand's striped shopping bag, drawn in CSS. */}
          <div className="bag relative w-[78%] pt-14">
            <div className="absolute top-0 left-1/2 h-20 w-[46%] -translate-x-1/2 rounded-t-full border-[10px] border-b-0 border-foreground" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-[6px] shadow-[0_30px_60px_-24px_rgba(26,26,26,0.45)]">
              <Stripes className="aspect-[4/4.6]" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-b from-transparent via-transparent to-black/10">
                <span className="rounded-sm bg-white px-4 py-2 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/gocolors-logo.png" alt="" className="h-7 w-auto" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 pb-14 md:grid-cols-3 md:px-10">
        {TILES.map((t, i) => (
          <Link key={t.label} href={t.href} className="rise group relative flex min-h-56 flex-col justify-between overflow-hidden rounded-[4px] p-6 text-white transition hover:-translate-y-1" style={{ background: t.color }}>
            <span className={`${condensed.className} text-4xl font-extrabold tracking-wide uppercase`}>{t.label}</span>
            <p className="max-w-xs text-[15px] leading-snug font-medium text-white/95">{t.text}</p>
            <span className="absolute top-6 right-6 text-sm font-semibold opacity-80 group-hover:opacity-100">0{i + 1} →</span>
          </Link>
        ))}
      </section>

      <footer className="border-t border-foreground/10">
        <p className="mx-auto max-w-7xl px-6 py-6 text-xs text-foreground/60 md:px-10">
          Not affiliated with or endorsed by Go Colors (Go Fashion (India) Ltd). Brand marks belong to their owner.
        </p>
      </footer>
    </div>
    </>
  );
}
