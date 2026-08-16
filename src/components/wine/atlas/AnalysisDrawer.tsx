"use client";

import { useI18n, useT } from "@/lib/i18n/Provider";
import { BacktestCard } from "@/components/wine/BacktestCard";
import { ExecutiveSummary } from "@/components/wine/ExecutiveSummary";
import { FullReportCard } from "@/components/wine/FullReportCard";
import { RiskCard } from "@/components/wine/RiskCard";
import { TerroirCard } from "@/components/wine/TerroirCard";
import { DriverDonutChart } from "@/components/wine/charts/DriverDonutChart";
import { WeatherLineChart } from "@/components/wine/charts/WeatherLineChart";
import { RegionalRiskChart } from "@/components/wine/charts/RegionalRiskChart";
import { SentimentDonut } from "@/components/wine/charts/SentimentDonut";
import { ExportButton } from "@/components/wine/shared/ExportButton";
import { SubscribeDialog } from "@/components/wine/shared/SubscribeDialog";
import type { AnalyzeResult } from "@/lib/wine/types";

interface Props {
  result: AnalyzeResult;
  persona: "vineyard" | "trade";
  reportId?: string;
  canDownload?: boolean;
}

/**
 * Drawer content shown when the analysis flow returns a result. The shell
 * wraps this with a glass-strong panel + close button + scroll container.
 */
export function AnalysisDrawer({ result, persona, reportId, canDownload = true }: Props) {
  const t = useT();
  const { locale } = useI18n();
  const languageNames = { en: "English", fr: "français", zh: "中文" } as const;
  const hasDifferentReportLanguage = result.locale && result.locale !== locale;

  return (
    <div className="space-y-6">
      <header className="border-line flex flex-wrap items-end justify-between gap-4 border-b pb-5">
        <div>
          <p className="kicker">{t(`persona.${persona}`)}</p>
          <h2 className="mt-2 font-serif text-2xl font-medium leading-tight tracking-tight">
            {result.region.name}
          </h2>
          <p className="kicker tabular mt-1.5">
            {result.timeframe.start} → {result.timeframe.end}
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <ExportButton
            reportMarkdown={result.feature?.reportMarkdown}
            filename={`wine-signals-${result.region.id}.docx`}
            reportId={reportId}
            canDownload={canDownload}
          />
          <SubscribeDialog
            regionId={result.region.id}
            persona={persona}
            digestPreview={result.feature?.emailDigest}
          />
        </div>
      </header>

      {hasDifferentReportLanguage && result.locale && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("common.report_language_notice", { language: languageNames[result.locale] })}
        </p>
      )}

      <div className="space-y-6">
        {result.feature?.executiveSummary && (
          <ExecutiveSummary text={result.feature.executiveSummary} />
        )}
        {result.backtest && <BacktestCard backtest={result.backtest} />}
        <RiskCard result={result} />
        {result.geoSnapshot && <TerroirCard snapshot={result.geoSnapshot} />}
        <DriverDonutChart drivers={result.drivers} />
        <WeatherLineChart regionId={result.region.id} />
        {persona === "trade" && (
          <div className="grid gap-6 md:grid-cols-2">
            <RegionalRiskChart selectedId={result.region.id} />
            <SentimentDonut regionId={result.region.id} />
          </div>
        )}
        {result.feature?.reportMarkdown && (
          <FullReportCard markdown={result.feature.reportMarkdown} />
        )}
      </div>
    </div>
  );
}
