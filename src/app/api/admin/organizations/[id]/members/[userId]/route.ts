import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/types";
import { OrgError, updateOrganizationMember } from "@/lib/auth/orgs";
import { isSameOrigin } from "@/lib/auth/request-security";

export const runtime = "nodejs";

const PatchBody = z
  .object({
    role: z
      .enum(["platformAdmin", "wineryAdmin", "wineryStaff", "buyerAdmin", "buyerStaff"])
      .optional(),
    status: z.enum(["pending", "active", "disabled"]).optional(),
  })
  .refine((value) => value.role !== undefined || value.status !== undefined);

function orgError(error: unknown) {
  if (error instanceof OrgError) {
    const status =
      error.code === "FORBIDDEN"
        ? 403
        : error.code === "ORG_NOT_FOUND" || error.code === "MEMBER_NOT_FOUND"
          ? 404
          : error.code === "EMAIL_EXISTS"
            ? 409
            : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json({ error: "Organization operation failed" }, { status: 500 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  if (!isSameOrigin(request))
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user, "user:manage") && !hasPermission(user, "user:manage:organization"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = PatchBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid update" }, { status: 400 });
  const { id, userId } = await params;
  try {
    await updateOrganizationMember(user, id, userId, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return orgError(error);
  }
}
