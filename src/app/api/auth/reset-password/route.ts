import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeSetupToken, writeAuditLog } from "@/lib/auth/db";
import { isSameOrigin } from "@/lib/auth/request-security";

const Body = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(12).max(128),
});
export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Use a password of at least 12 characters" },
      { status: 400 },
    );
  const consumed = await consumeSetupToken(parsed.data.token, parsed.data.password);
  if (!consumed)
    return NextResponse.json({ error: "This reset link is invalid or expired" }, { status: 400 });
  await writeAuditLog(
    consumed.userId,
    consumed.type === "invite" ? "auth.invite_accepted" : "auth.password_reset",
    "user",
    consumed.userId,
  );
  return NextResponse.json({ ok: true });
}
