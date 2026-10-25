import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/app/providers";
import { Nav } from "@/components/app/nav";
import { ChatPanel } from "@/components/app/chat-panel";

export const metadata: Metadata = {
  title: "Franchise Partner Engine",
  description: "Franchise partner acquisition, geo-selection and onboarding (MESA Ops Hackathon, Case 1).",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          <Nav />
          <p className="border-b bg-muted/40 px-4 py-1 text-xs text-muted-foreground">
            Scenario: Go Colors (Go Fashion (India) Ltd) scaling through franchise partners. Go Colors has not published India franchise terms; every status here is a recommendation for a human reviewer.
          </p>
          <main className="mx-auto max-w-7xl p-4">{children}</main>
          <ChatPanel />
        </Providers>
      </body>
    </html>
  );
}
