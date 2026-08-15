"use client";

import { useT } from "@/lib/i18n/Provider";
import { TimeframePicker } from "@/components/wine/shared/TimeframePicker";
import { UploadArea } from "@/components/wine/vineyard/UploadArea";
import { ReportHistory } from "@/components/wine/vineyard/ReportHistory";
import type { AnalyzeResult, Region, Timeframe, UploadMeta } from "@/lib/wine/types";

interface Props {
  region: Pick<Region, "id" | "name" | "parent">;
  timeframe: Timeframe;
  onTimeframeChange: (t: Timeframe) => void;
  uploads: UploadMeta[];
  onUploadsChange: (u: UploadMeta[]) => void;
  question: string;
  onQuestionChange: (q: string) => void;
  onRun: () => void;
  canRun: boolean;
  authReady: boolean;
  loading: boolean;
  error: string | null;
  hasResult?: boolean;
  onShowAnalysis?: () => void;
  onSelectHistory: (result: AnalyzeResult, access: { reportId: string; canDownload: boolean }) => void;
}

export function VineyardControls({
  region,
  timeframe,
  onTimeframeChange,
  uploads,
  onUploadsChange,
  question,
  onQuestionChange,
  onRun,
  canRun,
  authReady,
  loading,
  error,
  hasResult,
  onShowAnalysis,
  onSelectHistory,
}: Props) {
  const t = useT();

  return (
    <>
      <header className="shrink-0 border-b border-line px-7 pb-5 pt-7">
        <p className="kicker">{t("atlas.selected_region")}</p>
        <h2 className="mt-3 font-serif text-[26px] font-medium leading-[1.15] tracking-tight">
          {region.name}
        </h2>
        <p className="kicker mt-2 capitalize">
          {region.parent === "burgundy" ? t("atlas.burgundy") : t("atlas.bordeaux")}
        </p>
      </header>

      <div className="flex flex-col gap-5 px-7 py-6">
        <TimeframePicker value={timeframe} onChange={onTimeframeChange} />

        <UploadArea uploads={uploads} onChange={onUploadsChange} />

        <ReportHistory onSelect={onSelectHistory} />

        <label className="flex flex-col gap-2 text-sm">
          <span className="section-kicker !mb-0">
            {t("common.question_placeholder").split("：")[0] ??
              t("common.question_placeholder")}
          </span>
          <textarea
            value={question}
            onChange={(e) => onQuestionChange(e.target.value)}
            rows={3}
            placeholder={t("common.question_placeholder")}
            className="rounded-md border border-line bg-surface-2 px-3 py-2 text-sm transition-colors focus:border-line-strong focus:bg-surface-3 focus:outline-none"
          />
        </label>

        <button
          type="button"
          onClick={onRun}
          disabled={loading || !canRun || !authReady}
          className="w-full rounded-pill bg-foreground px-4 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? t("common.running") : !authReady ? "Checking access…" : canRun ? t("common.run_analysis") : "Viewer · read only"}
        </button>
        {authReady&&!canRun?<p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-200">当前账号为 Viewer，只能查看已有报告，不能运行 Agent 分析。</p>:null}

        {hasResult && onShowAnalysis && !loading && (
          <button
            type="button"
            onClick={onShowAnalysis}
            className="chip w-full justify-center"
          >
            <svg viewBox="0 0 24 24" aria-hidden className="h-3 w-3 fill-none stroke-current" strokeWidth={2}>
              <path d="M3 12h13M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("atlas.show_last_analysis")}
          </button>
        )}

        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}
      </div>
    </>
  );
}
