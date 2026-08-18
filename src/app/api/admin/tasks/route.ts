import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/types";
import { isSameOrigin } from "@/lib/auth/request-security";
import { insertDemoTasks, listTasksForAdmin } from "@/lib/tasks/store";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user, "report:read:any"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ tasks: await listTasksForAdmin() });
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production")
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isSameOrigin(request))
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user, "report:read:any"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const ids = await insertDemoTasks(user);
  return NextResponse.json({ ids }, { status: 201 });
}
