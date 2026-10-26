import type { Metadata } from "next";
import { Barlow_Condensed, Geist_Mono, Montserrat } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/app/providers";
import { Nav } from "@/components/app/nav";
import { ChatPanel } from "@/components/app/chat-panel";
import { DemoBanner } from "@/components/app/demo-banner";
import { SiteFooter } from "@/components/app/site-footer";
import { BrandStripe } from "@/components/app/brand-stripe";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat" });
const condensed = Barlow_Condensed({ subsets: ["latin"], weight: ["700", "800"], style: ["italic", "normal"], variable: "--font-condensed" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Go Colors Franchise Engine",
  description: "Go Colors franchise partner review, territory selection and onboarding (MESA Ops Hackathon, Case 1 case study).",
};

// Light (Go Colors brand) by default; a saved "dark" choice is applied before paint so there is no flash.
const themeScript = `try{if(localStorage.getItem("fe-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${montserrat.variable} ${condensed.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers>
          <BrandStripe />
          <Nav />
          <main className="px-4 pb-24 md:px-8">
            <div className="mx-auto max-w-7xl">
              <DemoBanner />
              {children}
            </div>
          </main>
          <SiteFooter />
          <ChatPanel />
        </Providers>
      </body>
    </html>
  );
}
