"use client";
import{useState}from"react";
import{ReportHistory}from"@/components/wine/vineyard/ReportHistory";
import{AnalysisDrawer}from"@/components/wine/atlas/AnalysisDrawer";
import type{AnalyzeResult}from"@/lib/wine/types";
export default function ReportsPage(){const[selected,setSelected]=useState<{result:AnalyzeResult;reportId:string;canDownload:boolean}|null>(null);return <main className="container mx-auto max-w-6xl px-7 py-12"><p className="kicker">Authorized intelligence</p><h1 className="mt-3 font-serif text-5xl">Reports</h1><p className="mt-3 text-sm text-soft">查看公开报告，以及由酒庄、酒商或供应链合作方授权给你的报告。</p><div className="mt-10 grid gap-8 lg:grid-cols-[340px_1fr]"><ReportHistory onSelect={(result,access)=>setSelected({result,...access})}/><section className="card-lg min-h-[360px] p-6">{selected?<AnalysisDrawer result={selected.result} persona={selected.result.persona} reportId={selected.reportId} canDownload={selected.canDownload}/>:<div className="grid min-h-[300px] place-items-center text-center text-sm text-soft">从左侧选择一份授权报告</div>}</section></div></main>}
