import dotenv from "dotenv";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import {
  cancelPendingTask,
  claimNextTask,
  cleanupTasks,
  completeTask,
  failTask,
  findTaskForUser,
  heartbeatTask,
  insertAnalysisTask,
  listTasksForAdmin,
  retryTask,
  updateTaskStage,
} from "../src/lib/tasks/store";
import { findUserById, closeDatabase } from "../src/lib/auth/db";
import type { AnalyzeInput, AnalyzeResult } from "../src/lib/wine/types";

dotenv.config({ path: ".env.local" });

function input(seed: string): AnalyzeInput {
  return {
    region: { id: "bordeaux-medoc", name: "Médoc", parent: "bordeaux" },
    timeframe: { start: "2025-04-01", end: "2025-10-31" },
    persona: "vineyard",
    locale: "en",
    question: seed,
  };
}

function result(): AnalyzeResult {
  return {
    region: { id: "bordeaux-medoc", name: "Médoc", parent: "bordeaux" },
    timeframe: { start: "2025-04-01", end: "2025-10-31" },
    persona: "vineyard",
    locale: "en",
    riskScore: 42,
    riskBand: "moderate",
    drivers: [],
    recommendations: [],
    trace: [],
    generatedAt: new Date().toISOString(),
    isDemoOrPartial: false,
  };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");
  const pool = new Pool({ connectionString: url });
  const taskIds: string[] = [];
  const userIds: string[] = [];
  try {
    const members = (
      await pool.query<{ id: string; organization_id: string }>(
        "SELECT u.id, om.organization_id FROM users u JOIN organization_members om ON om.user_id = u.id WHERE u.status='active' ORDER BY u.created_at",
      )
    ).rows;
    const ownerRow = members[0];
    const externalRow = members.find(
      (row) => row.organization_id !== ownerRow?.organization_id,
    );
    assert(ownerRow && externalRow, "two organizations required");
    const owner = await findUserById(ownerRow.id);
    const external = await findUserById(externalRow.id);
    assert(owner && external, "users must load");

    // ── insert → claim → stage → complete ─────────────────────────────────
    const first = await insertAnalysisTask(owner, input("first"));
    taskIds.push(first);
    const pending = await findTaskForUser(owner, first);
    assert.equal(pending?.status, "pending");
    assert.equal(pending?.stage, "queued");
    assert.equal(await findTaskForUser(external, first), null, "task must be owner-scoped");

    const claimed = await claimNextTask(60_000);
    assert(claimed && claimed.id === first, "claimed task must be the queued one");
    assert.equal((await findTaskForUser(owner, first))?.status, "running");
    const duplicate = await claimNextTask(60_000);
    assert.notEqual(duplicate?.id, first, "same task must not be claimed twice while fresh");

    await updateTaskStage(first, "extracting", 40);
    await heartbeatTask(first);
    assert.equal((await findTaskForUser(owner, first))?.stage, "extracting");

    await completeTask(first, result());
    const completed = await findTaskForUser(owner, first);
    assert.equal(completed?.status, "completed");
    assert.equal(completed?.progress, 100);
    assert.equal(completed?.result?.riskScore, 42);

    // ── admin list view includes owner + input summary ────────────────────
    const adminList = await listTasksForAdmin();
    const listed = adminList.find((t) => t.id === first);
    assert(listed, "completed task must appear in admin list");
    assert.equal(listed.ownerEmail, owner.email);
    assert.equal(listed.regionName, "Médoc");
    assert.equal(listed.persona, "vineyard");

    // ── failure path ───────────────────────────────────────────────────────
    const second = await insertAnalysisTask(owner, input("second"));
    taskIds.push(second);
    assert(await claimNextTask(60_000));
    await failTask(second, "boom");
    const failed = await findTaskForUser(owner, second);
    assert.equal(failed?.status, "failed");
    assert.equal(failed?.error, "boom");

    // ── retry failed task → re-queued and claimable ───────────────────────
    assert(await retryTask(second), "failed task must be retryable");
    assert.equal((await findTaskForUser(owner, second))?.status, "pending");
    const retried = await claimNextTask(60_000);
    assert(retried && retried.id === second, "retried task must be claimable");

    // ── cancel queued task; running/completed tasks are protected ─────────
    const fourth = await insertAnalysisTask(owner, input("fourth"));
    taskIds.push(fourth);
    assert(await cancelPendingTask(fourth), "queued task must be cancellable");
    assert.equal((await findTaskForUser(owner, fourth))?.status, "cancelled");
    const afterCancel = await claimNextTask(60_000);
    assert.notEqual(afterCancel?.id, fourth, "cancelled task must not be claimed");
    assert.equal(await cancelPendingTask(first), false, "completed task must not be cancellable");

    // ── stale heartbeat → crash recovery re-claim ─────────────────────────
    const third = await insertAnalysisTask(owner, input("third"));
    taskIds.push(third);
    assert(await claimNextTask(60_000));
    await pool.query("UPDATE analysis_tasks SET heartbeat=$1 WHERE id=$2", [
      Date.now() - 120_000,
      third,
    ]);
    const reclaimed = await claimNextTask(60_000);
    assert(reclaimed && reclaimed.id === third, "stale running task must be re-claimed");

    // ── platform admin may inspect any task ───────────────────────────────
    const adminId = randomUUID();
    userIds.push(adminId);
    const now = Date.now();
    await pool.query(
      "INSERT INTO users(id,email,name,password_hash,role,status,organization_type,organization_name,created_at,email_verified_at)VALUES($1,$2,$3,'test:test','platformAdmin','active','buyer','Admin Org',$4,$4)",
      [adminId, `task-admin-${adminId}@test.local`, "Task Admin", now],
    );
    await pool.query(
      "INSERT INTO organization_members(organization_id,user_id,created_at)VALUES($1,$2,$3)",
      [owner.organizationId, adminId, now],
    );
    await pool.query(
      "INSERT INTO user_roles(user_id,role_id,organization_id,created_at)SELECT $1,id,$2,$3 FROM access_roles WHERE key='platformAdmin'",
      [adminId, owner.organizationId, now],
    );
    const admin = await findUserById(adminId);
    assert(admin, "admin must load");
    assert.equal((await findTaskForUser(admin, first))?.id, first, "platform admin must see any task");

    // ── TTL cleanup removes only stale finished tasks ─────────────────────
    const oldTask = await insertAnalysisTask(owner, input("old"));
    taskIds.push(oldTask);
    await pool.query(
      "UPDATE analysis_tasks SET status='completed',finished_at=1 WHERE id=$1",
      [oldTask],
    );
    await cleanupTasks(0);
    assert.equal(await findTaskForUser(owner, oldTask), null, "stale task must be cleaned up");

    console.log("Task queue checks passed.");
  } finally {
    if (taskIds.length)
      await pool.query("DELETE FROM analysis_tasks WHERE id=ANY($1::uuid[])", [taskIds]);
    if (userIds.length)
      await pool.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [userIds]);
    await Promise.all([pool.end(), closeDatabase()]);
  }
}

void main();
