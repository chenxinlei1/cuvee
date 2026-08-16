import { NextResponse } from "next/server";
import { revokeSession, writeAuditLog } from "@/lib/auth/db";
import { currentUser, sessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/auth/request-security";
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const user = await currentUser(); if (user) await writeAuditLog(user.id, "auth.logout", "user", user.id);
  const token = await sessionToken(); if (token) await revokeSession(token);
  const response = NextResponse.json({ ok: true }); response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 }); return response;
}
