"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface TaskRow {
  id: string;
  status: TaskStatus;
  stage: string | null;
  progress: number;
  error?: string | null;
  createdAt: number;
  startedAt?: number | null;
  finishedAt?: number | null;
  ownerEmail: string;
  ownerName: string;
  regionName: string;
  persona: string;
  vintage: string;
  chateau?: string | null;
}

const STATUS_META: Record<TaskStatus, { label: string; badge: string }> = {
  pending: { label: "排队中", badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  running: { label: "运行中", badge: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  completed: {
    label: "已完成",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  failed: { label: "失败", badge: "bg-red-500/10 text-red-700 dark:text-red-300" },
  cancelled: { label: "已取消", badge: "bg-surface-3 text-foreground" },
};

const FILTERS: Array<"all" | TaskStatus> = [
  "all",
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
];

function time(ms: number | null | undefined): string {
  if (!ms) return "—";
  // Deterministic UTC rendering — locale-sensitive formatting (toLocaleString)
  // renders differently on the server vs the browser and breaks hydration.
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

export function TaskQueue({ initialTasks }: { initialTasks: TaskRow[] }) {
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks);
  const [filter, setFilter] = useState<"all" | TaskStatus>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/tasks", { cache: "no-store" });
      if (response.ok) {
        setTasks(((await response.json()) as { tasks: TaskRow[] }).tasks);
      }
    } catch {
      // A dev-server restart can briefly interrupt polling. Keep the last data
      // instead of escalating a transient network failure to the error overlay.
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  async function act(id: string, action: "cancel" | "retry") {
    setMessage(null);
    const response = await fetch(`/api/admin/tasks/${id}`, {
      method: action === "cancel" ? "DELETE" : "POST",
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "操作失败");
      return;
    }
    await refresh();
  }

  async function seedDemoTasks() {
    setMessage(null);
    setSeeding(true);
    try {
      const response = await fetch("/api/admin/tasks", { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setMessage(data.error ?? "无法创建演示任务");
        return;
      }
      await refresh();
    } finally {
      setSeeding(false);
    }
  }

  const counts = useMemo(() => {
    const map = new Map<"all" | TaskStatus, number>([["all", tasks.length]]);
    for (const status of FILTERS.slice(1)) {
      map.set(status, tasks.filter((t) => t.status === status).length);
    }
    return map;
  }, [tasks]);

  const visible = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <details className="border-line group mt-8 overflow-hidden border-t">
      <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-5 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="kicker block">异步任务队列</span>
          <span className="mt-1 block text-lg font-semibold">
            分析任务 <span className="text-soft font-normal">· {tasks.length}</span>
          </span>
          <span className="text-soft mt-1 block text-xs">
            每 5 秒自动刷新 · 可取消排队任务并重试失败任务
          </span>
        </span>
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="text-soft h-4 w-4 shrink-0 fill-none stroke-current transition-transform group-open:rotate-180"
          strokeWidth="1.8"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="border-line border-t px-6 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div />
          <div className="flex flex-wrap items-center gap-1.5">
            {process.env.NODE_ENV === "development" ? (
              <button
                onClick={() => void seedDemoTasks()}
                disabled={seeding}
                className="chip disabled:cursor-not-allowed disabled:opacity-50"
              >
                {seeding ? "创建中…" : "+ 演示任务"}
              </button>
            ) : null}
            {FILTERS.map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`chip ${filter === key ? "bg-foreground text-background" : ""}`}
              >
                {STATUS_META[key as TaskStatus]?.label ?? "全部"} · {counts.get(key) ?? 0}
              </button>
            ))}
          </div>
        </div>
      </div>

      {message ? (
        <p className="border-line border-b bg-red-500/5 px-6 py-3 text-sm text-red-600">
          {message}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <p className="text-soft px-6 py-12 text-center text-sm">当前状态下没有任务。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-soft border-line border-b text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 font-semibold">状态</th>
                <th className="px-4 py-3 font-semibold">请求</th>
                <th className="px-4 py-3 font-semibold">提交人</th>
                <th className="px-4 py-3 font-semibold">创建时间</th>
                <th className="px-4 py-3 font-semibold">错误</th>
                <th className="px-6 py-3 text-right font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {visible.map((task) => {
                const meta = STATUS_META[task.status];
                const canCancel = task.status === "pending";
                const canRetry = task.status === "failed";
                const showError =
                  task.error && (expanded === task.id || (task.error?.length ?? 0) <= 90);
                return (
                  <tr key={task.id} className="hover:bg-surface-1/60">
                    <td className="px-6 py-3 align-top">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.badge}`}
                      >
                        {meta.label}
                      </span>
                      {task.status === "running" ? (
                        <div className="mt-2 w-28">
                          <div className="bg-surface-3 h-1.5 overflow-hidden rounded-full">
                            <div
                              className="h-full rounded-full bg-sky-500 transition-all"
                              style={{ width: `${Math.max(task.progress, 4)}%` }}
                            />
                          </div>
                          <p className="text-soft mt-1 text-[10px]">
                            {task.stage ?? "正在启动"} · {task.progress}%
                          </p>
                        </div>
                      ) : task.status === "pending" ? (
                        <p className="text-soft mt-1 text-[10px]">{task.stage ?? "排队中"}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <strong className="block">{task.regionName}</strong>
                      <span className="text-soft text-xs">
                        {task.vintage} · {task.persona}
                        {task.chateau ? ` · ${task.chateau}` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="block text-xs font-medium">{task.ownerName}</span>
                      <span className="text-soft text-xs">{task.ownerEmail}</span>
                    </td>
                    <td className="text-soft px-4 py-3 align-top text-xs">
                      {time(task.createdAt)}
                      {task.finishedAt ? (
                        <span className="block">fin {time(task.finishedAt)}</span>
                      ) : null}
                    </td>
                    <td className="max-w-56 px-4 py-3 align-top text-xs">
                      {task.error ? (
                        <>
                          <span className="text-red-600 dark:text-red-400">
                            {showError ? task.error : `${task.error.slice(0, 90)}…`}
                          </span>
                          {(task.error?.length ?? 0) > 90 ? (
                            <button
                              onClick={() => setExpanded(expanded === task.id ? null : task.id)}
                              className="text-soft ml-1 underline"
                            >
                              {expanded === task.id ? "收起" : "更多"}
                            </button>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-soft">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right align-top">
                      {canCancel ? (
                        <button
                          onClick={() => void act(task.id, "cancel")}
                          className="chip border-red-500/30 text-red-600 hover:bg-red-500/10"
                        >
                          取消
                        </button>
                      ) : null}
                      {canRetry ? (
                        <button onClick={() => void act(task.id, "retry")} className="chip">
                          重试
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
}
