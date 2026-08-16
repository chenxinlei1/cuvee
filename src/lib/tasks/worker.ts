import "server-only";
import * as Sentry from "@sentry/nextjs";
import { analyze } from "@/lib/agents/orchestrator";
import { env } from "@/lib/env";
import { writeAuditLog } from "@/lib/auth/db";
import { gauge, increment } from "@/lib/observability/metrics";
import { log } from "@/lib/observability/logger";
import {
  claimNextTask,
  cleanupTasks,
  completeTask,
  countPendingTasks,
  failTask,
  heartbeatTask,
  updateTaskStage,
  type ClaimedTask,
} from "./store";

const CLEANUP_INTERVAL_MS = 10 * 60_000;
const HEARTBEAT_MS = 15_000;

const globalState = globalThis as typeof globalThis & {
  __cuveeWorkerStarted?: boolean;
};

let ticking = false;
let active = 0;
let lastCleanup = 0;

/**
 * Idempotent — starts the in-process dispatcher on first analysis submit.
 * Tasks are persisted in PostgreSQL and claimed with SKIP LOCKED, so several
 * instances can share the queue; a crashed worker's tasks are re-claimed once
 * their heartbeat goes stale.
 */
export function ensureWorkerStarted(): void {
  if (!env.CUVEE_WORKER_ENABLED || globalState.__cuveeWorkerStarted) return;
  globalState.__cuveeWorkerStarted = true;
  const timer = setInterval(() => {
    void tick();
  }, env.CUVEE_WORKER_POLL_MS);
  timer.unref?.();
  void tick();
}

async function tick(): Promise<void> {
  if (ticking) return;
  ticking = true;
  try {
    gauge("cuvee_worker_heartbeat", "Last worker heartbeat (epoch ms)", Date.now());
    gauge("cuvee_tasks_pending", "Queued or running analysis tasks", await countPendingTasks());
    if (Date.now() - lastCleanup > CLEANUP_INTERVAL_MS) {
      lastCleanup = Date.now();
      await cleanupTasks(env.CUVEE_TASK_TTL_MS);
    }
    while (active < env.CUVEE_WORKER_CONCURRENCY) {
      const claimed = await claimNextTask(env.CUVEE_WORKER_STALE_MS);
      if (!claimed) break;
      active += 1;
      void runTask(claimed).finally(() => {
        active -= 1;
      });
    }
  } catch (err) {
    log("error", "worker.tick_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    ticking = false;
  }
}

async function runTask(claimed: ClaimedTask): Promise<void> {
  const heartbeat = setInterval(() => {
    void heartbeatTask(claimed.id).catch(() => {});
  }, HEARTBEAT_MS);
  heartbeat.unref?.();
  try {
    increment("cuvee_tasks_started_total", "Analysis tasks started");
    log("info", "analysis.started", {
      taskId: claimed.id,
      userId: claimed.ownerId,
      organizationId: claimed.organizationId,
    });
    const result = await analyze(claimed.input, {
      ownerId: claimed.ownerId,
      onPhase: (phase) => {
        void updateTaskStage(claimed.id, phase.stage, phase.progress).catch(() => {});
      },
    });
    await completeTask(claimed.id, result);
    increment("cuvee_analyses_total", "Completed analyses");
    increment("cuvee_tasks_completed_total", "Analysis tasks completed");
    log("info", "analysis.completed", {
      taskId: claimed.id,
      userId: claimed.ownerId,
      organizationId: claimed.organizationId,
    });
    await writeAuditLog(claimed.ownerId, "analysis.completed", "analysis", claimed.id, {
      region: claimed.input.region.id,
      persona: claimed.input.persona,
      year: claimed.input.timeframe.start.slice(0, 4),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await failTask(claimed.id, message);
    increment("cuvee_analysis_errors_total", "Failed analyses");
    increment("cuvee_tasks_failed_total", "Analysis tasks failed");
    log("error", "analysis.failed", {
      taskId: claimed.id,
      userId: claimed.ownerId,
      error: message,
    });
    Sentry.captureException(err instanceof Error ? err : new Error(message), {
      extra: { taskId: claimed.id, userId: claimed.ownerId },
    });
  } finally {
    clearInterval(heartbeat);
  }
}
