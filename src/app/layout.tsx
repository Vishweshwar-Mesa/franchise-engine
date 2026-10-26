import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/app/providers";
import { Nav } from "@/components/app/nav";
import { ChatPanel } from "@/components/app/chat-panel";
import { DemoBanner } from "@/components/app/demo-banner";
import { SiteFooter } from "@/components/app/site-footer";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Franchise Partner Engine",
  description: "Franchise partner acquisition, geo-selection and onboarding (MESA Ops Hackathon, Case 1).",
};

// Dark by default; a saved "light" choice is applied before paint so there is no flash.
const themeScript = `try{if(localStorage.getItem("fe-theme")==="light")document.documentElement.classList.remove("dark")}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark ${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers>
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
