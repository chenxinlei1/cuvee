import "server-only";
import { randomUUID } from "node:crypto";
import { getPool } from "@/lib/auth/db";
import { hasPermission } from "@/lib/auth/types";
import type { AuthUser } from "@/lib/auth/types";
import type { AnalyzeInput, AnalyzeResult } from "@/lib/wine/types";

export type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface AnalysisTask {
  id: string;
  ownerId: string;
  organizationId?: string | null;
  status: TaskStatus;
  stage: string | null;
  progress: number;
  result?: AnalyzeResult | null;
  error?: string | null;
  createdAt: number;
  startedAt?: number | null;
  finishedAt?: number | null;
}

export interface ClaimedTask {
  id: string;
  ownerId: string;
  organizationId: string | null;
  input: AnalyzeInput;
}

/** Platform-admin view of a task with owner + input summary fields. */
export interface AdminTask extends AnalysisTask {
  ownerEmail: string;
  ownerName: string;
  regionName: string;
  persona: string;
  vintage: string;
  chateau?: string | null;
}

function rowToTask(row: {
  id: string;
  owner_id: string;
  organization_id: string | null;
  status: string;
  stage: string | null;
  progress: string | number;
  result: AnalyzeResult | null;
  error: string | null;
  created_at: string | number;
  started_at: string | number | null;
  finished_at: string | number | null;
}): AnalysisTask {
  return {
    id: row.id,
    ownerId: row.owner_id,
    organizationId: row.organization_id,
    status: row.status as TaskStatus,
    stage: row.stage,
    progress: Number(row.progress),
    result: row.result,
    error: row.error,
    createdAt: Number(row.created_at),
    startedAt: row.started_at === null ? null : Number(row.started_at),
    finishedAt: row.finished_at === null ? null : Number(row.finished_at),
  };
}

/** Create a queued analysis task owned by `user`. Returns immediately. */
export async function insertAnalysisTask(
  user: AuthUser,
  input: AnalyzeInput,
): Promise<string> {
  if (!user.organizationId) throw new Error("ORGANIZATION_REQUIRED");
  const id = randomUUID();
  const now = Date.now();
  await getPool().query(
    `INSERT INTO analysis_tasks(id,owner_id,organization_id,input,status,stage,progress,created_at,heartbeat)
     VALUES($1,$2,$3,$4,'pending','queued',0,$5,$5)`,
    [id, user.id, user.organizationId, input, now],
  );
  return id;
}

/** Create non-executable task fixtures for the development admin dashboard. */
export async function insertDemoTasks(user: AuthUser): Promise<string[]> {
  const now = Date.now();
  const fixtures: Array<{
    input: AnalyzeInput & { demoFixture: true };
    status: TaskStatus;
    stage: string;
    progress: number;
    createdAt: number;
    startedAt: number | null;
    finishedAt: number | null;
    error: string | null;
  }> = [
    {
      input: {
        demoFixture: true,
        region: { id: "medoc", name: "Medoc", parent: "bordeaux" },
        timeframe: { start: "2026-01-01", end: "2026-12-31" },
        persona: "vineyard",
        locale: "zh",
        question: "演示任务：等待 worker 分配",
      },
      status: "pending",
      stage: "queued",
      progress: 0,
      createdAt: now,
      startedAt: null,
      finishedAt: null,
      error: null,
    },
    {
      input: {
        demoFixture: true,
        region: { id: "pauillac", name: "Pauillac", parent: "bordeaux" },
        timeframe: { start: "2025-01-01", end: "2025-12-31" },
        persona: "trade",
        tradePersona: "merchant",
        locale: "zh",
        chateau: "Chateau Latour",
      },
      status: "running",
      stage: "collecting signals",
      progress: 58,
      createdAt: now - 70_000,
      startedAt: now - 42_000,
      finishedAt: null,
      error: null,
    },
    {
      input: {
        demoFixture: true,
        region: { id: "cote-de-nuits", name: "Cote de Nuits", parent: "burgundy" },
        timeframe: { start: "2024-01-01", end: "2024-12-31" },
        persona: "vineyard",
        locale: "zh",
      },
      status: "completed",
      stage: "complete",
      progress: 100,
      createdAt: now - 220_000,
      startedAt: now - 190_000,
      finishedAt: now - 24_000,
      error: null,
    },
    {
      input: {
        demoFixture: true,
        region: { id: "saint-emilion", name: "Saint-Emilion", parent: "bordeaux" },
        timeframe: { start: "2023-01-01", end: "2023-12-31" },
        persona: "trade",
        tradePersona: "restaurant",
        locale: "zh",
      },
      status: "failed",
      stage: "failed",
      progress: 36,
      createdAt: now - 140_000,
      startedAt: now - 95_000,
      finishedAt: now - 61_000,
      error: "Demo failure: upstream weather provider timed out after 30 seconds.",
    },
  ];
  const ids = fixtures.map(() => randomUUID());

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "DELETE FROM analysis_tasks WHERE owner_id=$1 AND input->>'demoFixture'='true'",
      [user.id],
    );
    for (const [index, fixture] of fixtures.entries()) {
      await client.query(
        `INSERT INTO analysis_tasks(
           id,owner_id,organization_id,input,status,stage,progress,error,
           heartbeat,created_at,started_at,finished_at
         ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          ids[index],
          user.id,
          user.organizationId ?? null,
          fixture.input,
          fixture.status,
          fixture.stage,
          fixture.progress,
          fixture.error,
          fixture.status === "running" ? now + 24 * 60 * 60_000 : now,
          fixture.createdAt,
          fixture.startedAt,
          fixture.finishedAt,
        ],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return ids;
}

/**
 * Claim one queued task, or re-claim a running task whose heartbeat is stale
 * (crashed worker). Uses `FOR UPDATE SKIP LOCKED` so multiple app instances
 * can share the queue without double-execution.
 */
export async function claimNextTask(staleMs: number): Promise<ClaimedTask | null> {
  const now = Date.now();
  const result = await getPool().query<{
    id: string;
    owner_id: string;
    organization_id: string | null;
    input: AnalyzeInput;
  }>(
    `UPDATE analysis_tasks
     SET status='running', started_at=COALESCE(started_at,$2), heartbeat=$2, stage='starting'
     WHERE id=(
       SELECT id FROM analysis_tasks
       WHERE COALESCE(input->>'demoFixture','false') <> 'true'
         AND (status='pending' OR (status='running' AND (heartbeat IS NULL OR heartbeat < $1)))
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING id,owner_id,organization_id,input`,
    [now - staleMs, now],
  );
  const row = result.rows[0];
  return row ? { id: row.id, ownerId: row.owner_id, organizationId: row.organization_id, input: row.input } : null;
}

export async function updateTaskStage(
  id: string,
  stage: string,
  progress: number,
): Promise<void> {
  await getPool().query(
    "UPDATE analysis_tasks SET stage=$1,progress=$2,heartbeat=$3 WHERE id=$4",
    [stage, progress, Date.now(), id],
  );
}

export async function heartbeatTask(id: string): Promise<void> {
  await getPool().query("UPDATE analysis_tasks SET heartbeat=$1 WHERE id=$2 AND status='running'", [
    Date.now(),
    id,
  ]);
}

export async function completeTask(id: string, result: AnalyzeResult): Promise<void> {
  await getPool().query(
    "UPDATE analysis_tasks SET status='completed',stage='complete',progress=100,result=$1,error=NULL,finished_at=$2,heartbeat=$2 WHERE id=$3",
    [result, Date.now(), id],
  );
}

export async function failTask(id: string, error: string): Promise<void> {
  await getPool().query(
    "UPDATE analysis_tasks SET status='failed',stage='failed',error=$1,finished_at=$2,heartbeat=$2 WHERE id=$3",
    [error, Date.now(), id],
  );
}

/** Owner-scoped lookup — platform admins may inspect any task. */
export async function findTaskForUser(
  user: AuthUser,
  id: string,
): Promise<AnalysisTask | null> {
  const any = hasPermission(user, "report:read:any");
  const result = await getPool().query<{
    id: string;
    owner_id: string;
    organization_id: string | null;
    status: string;
    stage: string | null;
    progress: string | number;
    result: AnalyzeResult | null;
    error: string | null;
    created_at: string | number;
    started_at: string | number | null;
    finished_at: string | number | null;
  }>(
    `SELECT id,owner_id,organization_id,status,stage,progress,result,error,created_at,started_at,finished_at
     FROM analysis_tasks WHERE id=$1${any ? "" : " AND owner_id=$2"}`,
    any ? [id] : [id, user.id],
  );
  const row = result.rows[0];
  return row ? rowToTask(row) : null;
}

export async function countPendingTasks(): Promise<number> {
  const result = await getPool().query<{ count: string }>(
    "SELECT count(*) count FROM analysis_tasks WHERE status IN ('pending','running')",
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function cleanupTasks(ttlMs: number): Promise<void> {
  const cutoff = Date.now() - ttlMs;
  await getPool().query(
    `DELETE FROM analysis_tasks
     WHERE (status IN ('completed','failed') AND finished_at < $1)
        OR (status='pending' AND created_at < $1)`,
    [cutoff],
  );
}

export async function listTasksForAdmin(limit = 200): Promise<AdminTask[]> {
  const result = await getPool().query<{
    id: string;
    owner_id: string;
    organization_id: string | null;
    status: string;
    stage: string | null;
    progress: string | number;
    result: AnalyzeResult | null;
    error: string | null;
    created_at: string | number;
    started_at: string | number | null;
    finished_at: string | number | null;
    owner_email: string;
    owner_name: string;
    region_name: string;
    persona: string;
    vintage: string;
    chateau: string | null;
  }>(
    `SELECT t.id,t.owner_id,t.organization_id,t.status,t.stage,t.progress,t.result,t.error,
            t.created_at,t.started_at,t.finished_at,
            u.email owner_email,u.name owner_name,
            t.input->'region'->>'name' region_name,
            t.input->>'persona' persona,
            t.input->'timeframe'->>'start' vintage,
            t.input->>'chateau' chateau
     FROM analysis_tasks t JOIN users u ON u.id=t.owner_id
     ORDER BY t.created_at DESC LIMIT $1`,
    [limit],
  );
  return result.rows.map((row) => ({
    ...rowToTask(row),
    ownerEmail: row.owner_email,
    ownerName: row.owner_name,
    regionName: row.region_name ?? "—",
    persona: row.persona ?? "—",
    vintage: row.vintage ? row.vintage.slice(0, 4) : "—",
    chateau: row.chateau,
  }));
}

/** Cancel a queued task. Running/completed tasks are left untouched. */
export async function cancelPendingTask(id: string): Promise<boolean> {
  const result = await getPool().query(
    "UPDATE analysis_tasks SET status='cancelled',stage='cancelled',error='Cancelled by administrator',finished_at=$2,heartbeat=$2 WHERE id=$1 AND status='pending'",
    [id, Date.now()],
  );
  return (result.rowCount ?? 0) > 0;
}

/** Re-queue a failed task so the worker picks it up again. */
export async function retryTask(id: string): Promise<boolean> {
  const result = await getPool().query(
    `UPDATE analysis_tasks SET status='pending',stage='queued',error=NULL,result=NULL,
            started_at=NULL,finished_at=NULL,heartbeat=NULL,progress=0
     WHERE id=$1 AND status='failed'`,
    [id],
  );
  return (result.rowCount ?? 0) > 0;
}
