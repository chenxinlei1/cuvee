"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DICT, DEFAULT_LOCALE, type DictKey, type Locale } from "@/lib/i18n/dict";
import { ZH_DICT } from "@/lib/i18n/zh";

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("cuvee-locale");
    if (saved === "en" || saved === "fr" || saved === "zh") setLocale(saved);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("cuvee-locale", locale);
    document.documentElement.lang = locale === "zh" ? "zh-CN" : locale;
  }, [hydrated, locale]);

  const t = useCallback(
    (key: DictKey, vars?: Record<string, string | number>) => {
      const entry = DICT[key];
      let str: string = locale === "zh" ? ZH_DICT[key] : locale === "fr" ? entry.fr : entry.en;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return str;
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t }), [locale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

/** Convenience: get `t` directly. */
export function useT(): I18nContextValue["t"] {
  return useI18n().t;
}
