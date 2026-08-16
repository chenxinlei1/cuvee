import { NextResponse } from "next/server";
import { listSessions, revokeOtherSessions, revokeSessionById, writeAuditLog } from "@/lib/auth/db";
import { currentUser, sessionToken } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/auth/request-security";

export async function GET() {
  const user = await currentUser(), token = await sessionToken();
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ sessions: await listSessions(user.id, token) });
}
export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const user = await currentUser(), token = await sessionToken();
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  const count = id ? Number(await revokeSessionById(user.id, id)) : await revokeOtherSessions(user.id, token);
  await writeAuditLog(user.id, id ? "auth.session_revoked" : "auth.other_sessions_revoked", "session", id ?? undefined, { count });
  return NextResponse.json({ ok: true, count });
}
