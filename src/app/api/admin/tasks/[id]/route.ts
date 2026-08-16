import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/types";
import { writeAuditLog } from "@/lib/auth/db";
import { cancelPendingTask, retryTask } from "@/lib/tasks/store";
import { ensureWorkerStarted } from "@/lib/tasks/worker";
import { increment } from "@/lib/observability/metrics";
import { log } from "@/lib/observability/logger";

export const runtime = "nodejs";

async function actor() {
  const user = await currentUser();
  if (!user) return null;
  if (!hasPermission(user, "report:read:any")) return null;
  return user;
}

/** Cancel a queued task. */
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await actor();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  if (!(await cancelPendingTask(id)))
    return NextResponse.json(
      { error: "Only queued tasks can be cancelled" },
      { status: 409 },
    );
  await writeAuditLog(user.id, "analysis.cancel", "analysis", id);
  increment("cuvee_tasks_cancelled_total", "Analysis tasks cancelled");
  log("info", "analysis.cancelled", { taskId: id, userId: user.id });
  return NextResponse.json({ ok: true });
}

/** Re-queue a failed task. */
export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await actor();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  if (!(await retryTask(id)))
    return NextResponse.json({ error: "Only failed tasks can be retried" }, { status: 409 });
  ensureWorkerStarted();
  await writeAuditLog(user.id, "analysis.retry", "analysis", id);
  increment("cuvee_tasks_retried_total", "Analysis tasks retried");
  log("info", "analysis.retried", { taskId: id, userId: user.id });
  return NextResponse.json({ ok: true });
}
