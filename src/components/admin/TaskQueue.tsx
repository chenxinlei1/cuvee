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
  pending: { label: "Queued", badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  running: { label: "Running", badge: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  completed: { label: "Completed", badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  failed: { label: "Failed", badge: "bg-red-500/10 text-red-700 dark:text-red-300" },
  cancelled: { label: "Cancelled", badge: "bg-surface-3 text-foreground" },
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
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TaskQueue({ initialTasks }: { initialTasks: TaskRow[] }) {
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks);
  const [filter, setFilter] = useState<"all" | TaskStatus>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/tasks", { cache: "no-store" });
    if (response.ok) {
      setTasks(((await response.json()) as { tasks: TaskRow[] }).tasks);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => void refresh(), 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  async function act(id: string, action: "cancel" | "retry") {
    setMessage(null);
    const response = await fetch(
      `/api/admin/tasks/${id}${action === "retry" ? "/retry" : ""}`,
      { method: action === "cancel" ? "DELETE" : "POST" },
    );
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Action failed");
      return;
    }
    await refresh();
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
    <section className="card-lg mt-6 overflow-hidden">
      <div className="border-line border-b px-6 py-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="kicker">Async task queue</p>
            <h2 className="mt-1 text-lg font-semibold">Analysis tasks</h2>
            <p className="text-soft mt-1 text-xs">
              Auto-refreshes every 5s · queued tasks can be cancelled, failed tasks retried
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`chip ${filter === key ? "bg-foreground text-background" : ""}`}
              >
                {STATUS_META[key as TaskStatus]?.label ?? "All"} · {counts.get(key) ?? 0}
              </button>
            ))}
          </div>
        </div>
      </div>

      {message ? (
        <p className="border-line border-b bg-red-500/5 px-6 py-3 text-sm text-red-600">{message}</p>
      ) : null}

      {visible.length === 0 ? (
        <p className="text-soft px-6 py-12 text-center text-sm">No tasks in this state.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-soft border-line border-b text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Request</th>
                <th className="px-4 py-3 font-semibold">Owner</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Error</th>
                <th className="px-6 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {visible.map((task) => {
                const meta = STATUS_META[task.status];
                const canCancel = task.status === "pending";
                const canRetry = task.status === "failed";
                const showError = task.error && (expanded === task.id || (task.error?.length ?? 0) <= 90);
                return (
                  <tr key={task.id} className="hover:bg-surface-1/60">
                    <td className="px-6 py-3 align-top">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.badge}`}>
                        {meta.label}
                      </span>
                      {task.status === "running" ? (
                        <div className="mt-2 w-28">
                          <div className="bg-surface-3 h-1.5 overflow-hidden rounded-full">
                            <div
                              className="bg-sky-500 h-full rounded-full transition-all"
                              style={{ width: `${Math.max(task.progress, 4)}%` }}
                            />
                          </div>
                          <p className="text-soft mt-1 text-[10px]">
                            {task.stage ?? "starting"} · {task.progress}%
                          </p>
                        </div>
                      ) : task.status === "pending" ? (
                        <p className="text-soft mt-1 text-[10px]">{task.stage ?? "queued"}</p>
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
                              {expanded === task.id ? "less" : "more"}
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
                          Cancel
                        </button>
                      ) : null}
                      {canRetry ? (
                        <button
                          onClick={() => void act(task.id, "retry")}
                          className="chip"
                        >
                          Retry
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
    </section>
  );
}
