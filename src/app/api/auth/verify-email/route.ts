import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeEmailVerificationToken, writeAuditLog } from "@/lib/auth/db";

const Query = z.object({ token: z.string().min(20).max(200) });
export async function GET(request: Request) {
  const parsed = Query.safeParse({ token: new URL(request.url).searchParams.get("token") });
  if (!parsed.success) return NextResponse.redirect(new URL("/verify-email?error=invalid", request.url));
  const userId = await consumeEmailVerificationToken(parsed.data.token);
  if (!userId) return NextResponse.redirect(new URL("/verify-email?error=expired", request.url));
  await writeAuditLog(userId, "auth.email_verified", "user", userId);
  return NextResponse.redirect(new URL("/verify-email?verified=1", request.url));
}
