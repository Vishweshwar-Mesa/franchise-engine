"use client";
import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export const THEME_KEY = "fe-theme";

/** Dark is the default; the choice is remembered in this browser. */
export function ThemeToggle({ className }: { className?: string }) {
  // Rendered only after the client store has loaded (see Providers), so the document is available.
  const [dark, setDark] = useState(() => typeof document === "undefined" || document.documentElement.classList.contains("dark"));
  function flip() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      /* storage blocked: still switches for this visit */
    }
    setDark(next);
  }
  return (
    <button
      type="button"
      onClick={flip}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn("inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors hover:bg-muted", className)}
    >
      {dark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
      {dark ? "Light mode" : "Dark mode"}
    </button>
  );
}
