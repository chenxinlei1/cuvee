import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/types";
import { listTasksForAdmin } from "@/lib/tasks/store";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user, "report:read:any"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ tasks: await listTasksForAdmin() });
}
