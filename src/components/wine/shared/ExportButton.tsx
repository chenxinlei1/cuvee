"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/Provider";

interface Props {
  reportMarkdown?: string;
  filename?: string;
  reportId?: string;
  canDownload?: boolean;
}

async function downloadWord(filename: string, markdown: string, reportId?:string): Promise<void> {
  const response = await fetch("/api/export/docx", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ markdown, reportId }),
  });
  if (!response.ok) throw new Error(`Word export failed (${response.status})`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.replace(/\.[^.]+$/, "") + ".docx";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function ExportButton({ reportMarkdown, filename, reportId, canDownload=true }: Props) {
  const t = useT();
  const [downloading, setDownloading] = useState(false);
  return (
    <div className="inline-flex gap-2 print:hidden">
      {reportMarkdown && canDownload && (
        <button
          type="button"
          disabled={downloading}
          onClick={() => {
            setDownloading(true);
            void downloadWord(filename ?? "wine-signals-report.docx", reportMarkdown, reportId).finally(() => setDownloading(false));
          }}
          className="chip transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {downloading ? t("common.loading") : t("feature.report.download")}
        </button>
      )}
      {canDownload?<button
        type="button"
        onClick={() => window.print()}
        className="rounded-pill bg-foreground px-4 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-background hover:opacity-90"
      >
        {t("common.export_report")}
      </button>:<span className="chip cursor-not-allowed opacity-50">View only</span>}
    </div>
  );
}
