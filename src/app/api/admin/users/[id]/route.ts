import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/types";
import { deleteUser, resetPassword, updateUser, writeAuditLog } from "@/lib/auth/db";
import { isSameOrigin } from "@/lib/auth/request-security";
const Body = z
  .object({
    role: z
      .enum(["platformAdmin", "wineryAdmin", "wineryStaff", "buyerAdmin", "buyerStaff"])
      .optional(),
    status: z.enum(["pending", "active", "disabled"]).optional(),
    organizationType: z.enum(["chateau", "negociant", "distributor", "buyer"]).optional(),
    organizationName: z.string().trim().min(2).max(120).optional(),
    password: z.string().min(12).max(128).optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined));
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request))
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(actor, "user:manage"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid update" }, { status: 400 });
  if (id === actor.id && (parsed.data.role !== undefined || parsed.data.status !== undefined))
    return NextResponse.json(
      { error: "You cannot change your own role or status" },
      { status: 400 },
    );
  let ok: boolean;
  try {
    ok = await updateUser(id, parsed.data);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "ROLE_NOT_ALLOWED")
      return NextResponse.json(
        { error: "Role is not allowed for this organization" },
        { status: 400 },
      );
    if (code === "LAST_ORG_ADMIN")
      return NextResponse.json(
        { error: "The organization must retain an active administrator" },
        { status: 409 },
      );
    throw error;
  }
  if (!ok) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (parsed.data.password !== undefined && !(await resetPassword(id, parsed.data.password)))
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  const auditedPatch = Object.fromEntries(
    Object.entries(parsed.data).filter(([key]) => key !== "password"),
  );
  await writeAuditLog(actor.id, "user.update", "user", id, {
    ...auditedPatch,
    passwordReset: parsed.data.password !== undefined,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request))
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(actor, "user:manage"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  if (id === actor.id)
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  try {
    const result = await deleteUser(id, actor.id);
    if (result === "not_found")
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (result === "last_admin")
      return NextResponse.json(
        { error: "The last active platform admin cannot be deleted" },
        { status: 409 },
      );
    if (result === "last_org_admin")
      return NextResponse.json(
        { error: "The organization must retain an active administrator" },
        { status: 409 },
      );
    await writeAuditLog(actor.id, "user.delete", "user", id, { ownershipTransferredTo: actor.id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "User owns conflicting data that could not be transferred" },
      { status: 409 },
    );
  }
}
