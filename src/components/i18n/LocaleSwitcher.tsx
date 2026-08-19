"use client";

import { useI18n } from "@/lib/i18n/Provider";
import { LOCALES } from "@/lib/i18n/dict";
import { cn } from "@/lib/utils";

export function LocaleSwitcher() {
  const { locale, setLocale } = useI18n();
  return (
    <div className="inline-flex shrink-0 rounded-lg border border-line bg-surface-1 p-1 text-[10px]">
      {LOCALES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLocale(l.code)}
          className={cn(
            "rounded-md px-2.5 py-1 font-bold uppercase transition-colors",
            locale === l.code
              ? "bg-foreground text-background"
              : "text-soft hover:text-foreground",
          )}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}
