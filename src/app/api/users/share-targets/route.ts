import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/session";
import { listOrganizationTargets, listShareTargets } from "@/lib/auth/db";
import { hasPermission } from "@/lib/auth/types";
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user, "report:manage"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [users, organizations] = await Promise.all([listShareTargets(), listOrganizationTargets()]);
  return NextResponse.json({ users, organizations });
}
