import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createAuthToken,
  createAuthTokenByEmail,
  createUser,
  emailVerificationState,
  userStatusByEmail,
  writeAuditLog,
} from "@/lib/auth/db";
import { sendAuthMail } from "@/lib/auth/mail";
import { isSameOrigin } from "@/lib/auth/request-security";

const Body = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(10).max(128),
  organizationType: z.enum(["chateau", "negociant", "distributor", "buyer"]),
  organizationName: z.string().trim().min(2).max(120),
});

const VERIFICATION_TTL_MS = 24 * 60 * 60_000;

async function sendVerification(
  request: Request,
  user: { id: string; email: string; name: string },
  token: string,
) {
  const verifyUrl = new URL(
    `/verify-email?token=${encodeURIComponent(token)}`,
    request.url,
  ).toString();
  await sendAuthMail({ to: user.email, name: user.name, url: verifyUrl, kind: "verify" });
  await writeAuditLog(user.id, "auth.register", "user", user.id);
  return NextResponse.json(
    {
      message: "Registration submitted. Verify your email, then wait for administrator approval.",
      ...(process.env.NODE_ENV !== "production" ? { devUrl: verifyUrl } : {}),
    },
    { status: 201 },
  );
}

export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid registration details" }, { status: 400 });

  try {
    const user = await createUser({
      ...parsed.data,
      role: parsed.data.organizationType === "chateau" ? "wineryStaff" : "buyerStaff",
      status: "pending",
      emailVerified: false,
    });
    const token = await createAuthToken(user.id, "email_verification", VERIFICATION_TTL_MS);
    return sendVerification(request, user, token);
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_EXISTS") {
      try {
        const [status, verified] = await Promise.all([
          userStatusByEmail(parsed.data.email),
          emailVerificationState(parsed.data.email),
        ]);
        if (status === "pending" && verified === false) {
          const existing = await createAuthTokenByEmail(
            parsed.data.email,
            "email_verification",
            VERIFICATION_TTL_MS,
          );
          if (existing) return sendVerification(request, existing.user, existing.token);
        }
      } catch {
        return NextResponse.json({ error: "Registration failed" }, { status: 500 });
      }
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
