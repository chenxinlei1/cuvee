import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, userStatusByEmail, writeAuditLog } from "@/lib/auth/db";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
export const runtime = "nodejs";
const Body = z.object({ email: z.string().email(), password: z.string().min(8).max(128) });
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user) {
    await writeAuditLog(null, "auth.login_failed", "user", undefined, { email: parsed.data.email });
    const status=await userStatusByEmail(parsed.data.email);
    if(status==="pending")return NextResponse.json({error:"Account awaiting administrator approval"},{status:403});
    if(status==="disabled")return NextResponse.json({error:"Account disabled by administrator"},{status:403});
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  await writeAuditLog(user.id, "auth.login", "user", user.id);
  const response = NextResponse.json({ user });
  response.cookies.set(SESSION_COOKIE, createSessionToken(user), sessionCookieOptions);
  return response;
}
