import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuthTokenByEmail, writeAuditLog } from "@/lib/auth/db";
import { sendAuthMail } from "@/lib/auth/mail";
import { isSameOrigin } from "@/lib/auth/request-security";

const Body = z.object({ email: z.string().email() });
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  const result = await createAuthTokenByEmail(parsed.data.email, "password_reset", 30 * 60 * 1000);
  let devUrl: string | undefined;
  if (result) {
    const url = new URL(`/reset-password?token=${encodeURIComponent(result.token)}`, request.url).toString();
    await sendAuthMail({ to: result.user.email, name: result.user.name, url, kind: "reset" });
    await writeAuditLog(result.user.id, "auth.password_reset_requested", "user", result.user.id);
    if (process.env.NODE_ENV !== "production") devUrl = url;
  }
  return NextResponse.json({ message: "If that account exists, a reset link has been sent.", ...(devUrl ? { devUrl } : {}) });
}
