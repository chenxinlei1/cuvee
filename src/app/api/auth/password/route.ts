import { NextResponse } from "next/server";
import { z } from "zod";
import { changePassword, revokeOtherSessions, revokeSession, writeAuditLog } from "@/lib/auth/db";
import { currentUser, sessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/auth/request-security";

const Body = z
  .object({
    currentPassword: z.string().min(8).max(128),
    newPassword: z.string().min(12).max(128),
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "New password must be different",
    path: ["newPassword"],
  });

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid password" },
      { status: 400 },
    );
  if (!(await changePassword(user.id, parsed.data.currentPassword, parsed.data.newPassword))) {
    await writeAuditLog(user.id, "auth.password_change_failed", "user", user.id);
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }
  await writeAuditLog(user.id, "auth.password_changed", "user", user.id);
  const token = await sessionToken();
  if (token) { await revokeOtherSessions(user.id, token); await revokeSession(token); }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
