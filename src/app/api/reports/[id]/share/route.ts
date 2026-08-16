import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/types";
import { setReportGrant, writeAuditLog } from "@/lib/auth/db";
const Body = z.object({
  targetKind: z.enum(["user", "organization"]),
  targetValue: z.string().min(1),
  shared: z.boolean(),
  expiresAt: z.number().int().positive().nullable().default(null),
  canDownload: z.boolean().default(false),
});
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user, "report:manage"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { id } = await params;
  const ok = await setReportGrant(user, id, parsed.data);
  if (!ok)
    return NextResponse.json(
      { error: "Report must be Restricted and target must be valid" },
      { status: 400 },
    );
  await writeAuditLog(
    user.id,
    parsed.data.shared ? "report.share" : "report.unshare",
    "report",
    id,
    parsed.data,
  );
  return NextResponse.json({ ok: true });
}
