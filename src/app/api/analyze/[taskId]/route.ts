import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/session";
import { findTaskForUser } from "@/lib/tasks/store";

export const runtime = "nodejs";

/** Poll endpoint — returns the task (and result once completed). */
export async function GET(
  _: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { taskId } = await params;
  const task = await findTaskForUser(user, taskId);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ task });
}
