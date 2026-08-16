"use client";

import { useState } from "react";
import {
  INITIAL_WORKFLOW,
  type NodeDetail,
  type NodeKey,
  type WorkflowState,
} from "@/components/wine/shared/WorkflowTrace";
import type { AnalyzeInput, AnalyzeResult } from "@/lib/wine/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Drives the analyze flow with a workflow-style visual progression.
 *
 * Analysis is submitted as an async task (POST /api/analyze → taskId) and
 * polled via GET /api/analyze/[taskId] until completed. The poll runs in
 * parallel with phased state transitions so the user sees the agents "wake
 * up" in topology order even when the backend (demo mode) finishes instantly.
 * Real-mode latency is absorbed inside phase 3 which awaits both the timer
 * and the poll promise.
 *
 * Phases — keep in sync with the WorkflowTrace topology:
 *   0.  input        — set to "ok" immediately on click
 *   1.  orchestrator — runs, then ok
 *   2.  fan-out      — weather + geo + tavily run in parallel
 *   3.  api join     — wait for response, map traces to ok/fail
 *   4.  extraction   — runs alone
 *   6.  extraction ok
 *   7.  feature      — runs, then ok
 *   8.  dashboard ok — reveal the result panel
 */
export function useAnalysisFlow() {
  const [workflowState, setWorkflowState] = useState<WorkflowState>(INITIAL_WORKFLOW);
  const [details, setDetails] = useState<Partial<Record<NodeKey, NodeDetail>>>({});
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadResult(data: AnalyzeResult): void {
    const traceMap = Object.fromEntries(data.trace.map((trace) => [trace.agent, trace]));
    const state: WorkflowState = { ...INITIAL_WORKFLOW };
    state.input = "ok";
    state.orchestrator = "ok";
    for (const key of [
      "weather_agent",
      "geo_agent",
      "tavily_agent",
      "extraction_agent",
      "feature_agent",
      "backtest_agent",
    ] as NodeKey[]) {
      const trace = traceMap[key];
      state[key] = trace ? (trace.ok ? "ok" : "fail") : key === "backtest_agent" ? "skipped" : "ok";
    }
    state.dashboard = "ok";
    setWorkflowState(state);
    setDetails(
      Object.fromEntries(
        Object.entries(traceMap).map(([key, trace]) => [
          key,
          { durationMs: trace.durationMs, summary: trace.summary, error: trace.error },
        ]),
      ) as Partial<Record<NodeKey, NodeDetail>>,
    );
    setResult(data);
    setError(null);
  }

  async function run(body: AnalyzeInput): Promise<void> {
    setLoading(true);
    setError(null);
    setResult(null);
    setDetails({});
    setWorkflowState({ ...INITIAL_WORKFLOW, input: "ok" });

    const apiPromise = (async (): Promise<{ok:true;data:AnalyzeResult}|{ok:false;status:number;message:string}> => {
      const submit = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!submit.ok) {
        const j = (await submit.json().catch(() => ({}))) as { error?: unknown };
        return {ok:false,status:submit.status,message:typeof j.error === "string" ? j.error : `HTTP ${submit.status}`};
      }
      const { taskId } = (await submit.json()) as { taskId?: string };
      if (!taskId) return { ok: false, status: 500, message: "Missing task id" };
      const deadline = Date.now() + 5 * 60_000;
      for (;;) {
        const res = await fetch(`/api/analyze/${encodeURIComponent(taskId)}`, { cache: "no-store" });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: unknown };
          return { ok: false, status: res.status, message: typeof j.error === "string" ? j.error : `HTTP ${res.status}` };
        }
        const { task } = (await res.json()) as {
          task?: { status: string; result?: AnalyzeResult; error?: string | null };
        };
        if (task?.status === "completed" && task.result) return { ok: true, data: task.result };
        if (task?.status === "failed")
          return { ok: false, status: 500, message: task.error ?? "Analysis failed" };
        if (Date.now() > deadline)
          return { ok: false, status: 504, message: "Analysis timed out after 5 minutes" };
        await sleep(1200);
      }
    })().catch(() => ({ ok:false as const, status:0, message:"Unable to reach the analysis service." }));

    try {
      // Phase 1 — orchestrator wakes up
      await sleep(160);
      setWorkflowState((s) => ({ ...s, orchestrator: "running" }));

      await sleep(360);
      setWorkflowState((s) => ({
        ...s,
        orchestrator: "ok",
        weather_agent: "running",
        geo_agent: "running",
        tavily_agent: "running",
      }));

      // Phase 2 — three sub-agents parallel; wait for both animation + API
      await sleep(900);
      const response = await apiPromise;
      if(!response.ok){
        setError(response.status===403?"当前账号只有查看权限，不能运行分析。":response.status===401?"登录已失效，请重新登录。":response.message);
        setWorkflowState(INITIAL_WORKFLOW);
        return;
      }
      const data=response.data;

      const traceMap = Object.fromEntries(data.trace.map((t) => [t.agent, t]));
      const setSub = (key: NodeKey): WorkflowState[NodeKey] => {
        const tr = traceMap[key];
        return tr ? (tr.ok ? "ok" : "fail") : "ok";
      };
      const detailOf = (key: NodeKey): NodeDetail | undefined => {
        const t = traceMap[key];
        return t ? { durationMs: t.durationMs, summary: t.summary, error: t.error } : undefined;
      };

      setWorkflowState((s) => ({
        ...s,
        weather_agent: setSub("weather_agent"),
        geo_agent: setSub("geo_agent"),
        tavily_agent: setSub("tavily_agent"),
      }));
      setDetails((d) => ({
        ...d,
        weather_agent: detailOf("weather_agent"),
        geo_agent: detailOf("geo_agent"),
        tavily_agent: detailOf("tavily_agent"),
      }));

      // Phase 3 — extraction runs alone
      await sleep(240);
      setWorkflowState((s) => ({ ...s, extraction_agent: "running" }));

      await sleep(560);
      setWorkflowState((s) => ({ ...s, extraction_agent: setSub("extraction_agent") }));
      setDetails((d) => ({ ...d, extraction_agent: detailOf("extraction_agent") }));

      // Phase 4 — feature
      await sleep(220);
      setWorkflowState((s) => ({ ...s, feature_agent: "running" }));

      await sleep(500);
      setWorkflowState((s) => ({ ...s, feature_agent: setSub("feature_agent") }));
      setDetails((d) => ({ ...d, feature_agent: detailOf("feature_agent") }));

      // Phase 4b — backtest_agent (only when isBacktest, detected by trace)
      const hasBacktest = traceMap.backtest_agent !== undefined;
      if (hasBacktest) {
        await sleep(200);
        setWorkflowState((s) => ({ ...s, backtest_agent: "running" }));
        await sleep(420);
        setWorkflowState((s) => ({ ...s, backtest_agent: setSub("backtest_agent") }));
        setDetails((d) => ({ ...d, backtest_agent: detailOf("backtest_agent") }));
      } else {
        // Skip the backtest node visually — mark it as "skipped".
        setWorkflowState((s) => ({ ...s, backtest_agent: "skipped" }));
      }

      // Phase 5 — dashboard / reveal
      await sleep(160);
      setWorkflowState((s) => ({ ...s, dashboard: "ok" }));
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
      setWorkflowState((s) => {
        const next = { ...s };
        for (const k of Object.keys(s) as NodeKey[]) {
          if (next[k] === "running" || next[k] === "pending") next[k] = "fail";
        }
        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  return { workflowState, details, result, loading, error, run, loadResult };
}
