import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/types";
import { createUser, listUsers, writeAuditLog } from "@/lib/auth/db";
import { isSameOrigin } from "@/lib/auth/request-security";
const Body = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(12).max(128),
  role: z.enum(["platformAdmin", "wineryAdmin", "wineryStaff", "buyerAdmin", "buyerStaff"]),
  organizationType: z.enum(["chateau", "negociant", "distributor", "buyer"]),
  organizationName: z.string().trim().min(2).max(120),
});
export async function GET() {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(actor, "user:manage"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ users: await listUsers() });
}
export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(actor, "user:manage"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid user details" }, { status: 400 });
  try {
    const user = await createUser({ ...parsed.data, status: "active" });
    await writeAuditLog(actor.id, "user.create", "user", user.id, { role: user.role });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return NextResponse.json(
      {
        error:
          code === "EMAIL_EXISTS"
            ? "Email already registered"
            : code === "ROLE_NOT_ALLOWED"
              ? "Role is not allowed for this organization"
              : "Create user failed",
      },
      { status: code === "EMAIL_EXISTS" ? 409 : code === "ROLE_NOT_ALLOWED" ? 400 : 500 },
    );
  }
}
