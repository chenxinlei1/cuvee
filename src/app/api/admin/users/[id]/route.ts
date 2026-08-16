import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/types";
import { updateUser, writeAuditLog } from "@/lib/auth/db";
const Body = z
  .object({
    role: z.enum(["platformAdmin", "wineryAdmin", "wineryStaff", "buyerAdmin", "buyerStaff"]).optional(),
    status: z.enum(["pending", "active", "disabled"]).optional(),
    organizationType: z.enum(["chateau", "negociant", "distributor", "buyer"]).optional(),
    organizationName: z.string().trim().min(2).max(120).optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined));
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
  const ok = await updateUser(id, parsed.data);
  if (!ok) return NextResponse.json({ error: "User not found" }, { status: 404 });
  await writeAuditLog(actor.id, "user.update", "user", id, parsed.data);
  return NextResponse.json({ ok: true });
}
