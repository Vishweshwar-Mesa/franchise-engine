import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/app/providers";
import { Nav } from "@/components/app/nav";
import { ChatPanel } from "@/components/app/chat-panel";
import { DemoBanner } from "@/components/app/demo-banner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz"] });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "Franchise Partner Engine",
  description: "Franchise partner acquisition, geo-selection and onboarding (MESA Ops Hackathon, Case 1).",
};

// Dark by default; a saved "light" choice is applied before paint so there is no flash.
const themeScript = `try{if(localStorage.getItem("fe-theme")==="light")document.documentElement.classList.remove("dark")}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${fraunces.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers>
          <div className="flex flex-col gap-4 p-4 md:flex-row">
            <Nav />
            <main className="min-w-0 flex-1 px-1 py-2 md:px-4">
              <div className="mx-auto max-w-6xl">
                <DemoBanner />
                {children}
              </div>
            </main>
          </div>
          <ChatPanel />
        </Providers>
      </body>
    </html>
  );
}
