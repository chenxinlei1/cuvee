import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, createSession, emailVerificationState, loginRetryAfter, recordLoginResult, userStatusByEmail, writeAuditLog } from "@/lib/auth/db";
import { BROWSER_SESSION_AGE, REMEMBERED_SESSION_AGE, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { clientIp, isSameOrigin } from "@/lib/auth/request-security";
export const runtime = "nodejs";
const Body = z.object({ email: z.string().email(), password: z.string().min(8).max(128), remember: z.boolean().optional().default(true) });
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  const retryAfter = await loginRetryAfter(parsed.data.email);
  if (retryAfter > 0)
    return NextResponse.json(
      { error: "Too many failed attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user) {
    await recordLoginResult(parsed.data.email, false);
    await writeAuditLog(null, "auth.login_failed", "user", undefined, { email: parsed.data.email });
    const status=await userStatusByEmail(parsed.data.email);
    if(status==="pending")return NextResponse.json({error:"Account awaiting platform admin approval"},{status:403});
    if(status==="disabled")return NextResponse.json({error:"Account disabled by administrator"},{status:403});
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  if ((await emailVerificationState(parsed.data.email)) === false) {
    await writeAuditLog(user.id, "auth.login_unverified", "user", user.id);
    return NextResponse.json({ error: "Verify your email before signing in" }, { status: 403 });
  }
  await recordLoginResult(parsed.data.email, true);
  await writeAuditLog(user.id, "auth.login", "user", user.id);
  const maxAge = parsed.data.remember ? REMEMBERED_SESSION_AGE : BROWSER_SESSION_AGE;
  const token = await createSession(user.id, { maxAgeSeconds: maxAge, userAgent: request.headers.get("user-agent") ?? undefined, ipAddress: clientIp(request) });
  const response = NextResponse.json({ user });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(maxAge));
  return response;
}
