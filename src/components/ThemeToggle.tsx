"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/Provider";

type Theme = "dark" | "light";

/**
 * Light/dark theme toggle. Reads the current state from <html class>
 * (set synchronously by the inline boot script in layout.tsx — that
 * prevents a flash of the wrong theme during hydration) and updates
 * both the class and localStorage on click.
 */
export function ThemeToggle() {
  const t = useT();
  const [theme, setTheme] = useState<Theme>("dark");

  // After hydration, sync local state with whatever the boot script chose.
  useEffect(() => {
    if (typeof document === "undefined") return;
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      window.localStorage.setItem("wine-theme", next);
    } catch {
      // Storage can fail in private mode / cross-origin iframes; the class
      // toggle still wins so the theme flips for this session.
    }
  }

  const next = theme === "dark" ? "light" : "dark";
  const nextLabel = next === "light" ? t("theme.light") : t("theme.dark");
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={nextLabel}
      title={nextLabel}
      className="group inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-1 text-soft transition-colors hover:bg-surface-2 hover:text-foreground"
    >
      {theme === "dark" ? (
        // Show sun glyph to indicate the action (switch to light).
        <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
        </svg>
      ) : (
        // Show moon glyph to indicate the action (switch to dark).
        <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
        </svg>
      )}
      <span className="sr-only">{nextLabel}</span>
    </button>
  );
}
