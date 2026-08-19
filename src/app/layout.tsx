import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { I18nProvider } from "@/lib/i18n/Provider";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { LocalizedNavLinks } from "@/components/i18n/LocalizedNavLinks";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

// Inline boot script — runs before React hydrates so the html class
// reflects the stored / preferred theme on first paint and there is no
// flash of the wrong theme. Reads localStorage first, falls back to
// prefers-color-scheme, defaults to dark.
const THEME_BOOT_SCRIPT = `
  (function() {
    try {
      var stored = window.localStorage.getItem('wine-theme');
      var theme = stored === 'light' || stored === 'dark'
        ? stored
        : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
      document.documentElement.classList.toggle('dark', theme === 'dark');
    } catch (e) {}
  })();
`;

export const metadata: Metadata = {
  title: "Cuvée — 葡萄酒情报平台",
  description: "面向勃艮第、波尔多与酒源溯源的多智能体分析平台。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark" suppressHydrationWarning>
      <head>
        <Script
          id="theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <I18nProvider>
          <TopNav />
          <div className="print:mt-0">{children}</div>
        </I18nProvider>
      </body>
    </html>
  );
}

function TopNav() {
  return (
    <nav className="glass sticky top-0 z-40 print:hidden">
      <div className="mx-auto flex min-h-16 max-w-[1540px] items-center gap-5 px-4 py-2 lg:px-7">
        <Link href="/" aria-label="Cuvée" className="group inline-flex shrink-0 items-center gap-3">
          <span className="grid h-7 w-7 place-items-center">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-[22px] w-[22px] fill-none stroke-current transition-transform duration-500 group-hover:rotate-90"
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 3v6c0 2.2 1.8 4 4 4s4-1.8 4-4V3" />
              <path d="M12 13v8" />
              <path d="M9 21h6" />
              <path d="M8 3h8" />
            </svg>
          </span>
          <span className="text-sm font-bold tracking-[0.04em]">Cuvée</span>
          <span className="kicker ml-1">Atlas</span>
        </Link>
        <div className="ml-auto flex min-w-0 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <LocalizedNavLinks />
          <ThemeToggle />
          <LocaleSwitcher />
        </div>
      </div>
    </nav>
  );
}
