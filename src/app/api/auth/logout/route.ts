import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/auth/db";
import { currentUser, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
export async function POST() {
  const user = await currentUser(); if (user) await writeAuditLog(user.id, "auth.logout", "user", user.id);
  const response = NextResponse.json({ ok: true }); response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 }); return response;
}
