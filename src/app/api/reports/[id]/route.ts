import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/types";
import { clientIp } from "@/lib/auth/request-security";
import {
  deleteReport,
  findReportForUser,
  recordReportAccess,
  writeAuditLog,
} from "@/lib/auth/db";
import { increment } from "@/lib/observability/metrics";
import { log } from "@/lib/observability/logger";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user, "report:read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const report = await findReportForUser(user, id);
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await Promise.all([
    recordReportAccess({
      reportId: id,
      userId: user.id,
      action: "view",
      ipAddress: clientIp(_),
      userAgent: _.headers.get("user-agent") ?? undefined,
    }),
    writeAuditLog(user.id, "report.view", "report", id),
  ]);
  increment("cuvee_report_views_total", "Authorized report views");
  log("info", "report.view", { userId: user.id, reportId: id, organizationId: user.organizationId });
  return NextResponse.json({ report });
}
export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){
  const user=await currentUser(); if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {id}=await params; const deleted=await deleteReport(user,id); if(!deleted)return NextResponse.json({error:"Not found"},{status:404});
  await writeAuditLog(user.id,"report.delete","report",id); return NextResponse.json({ok:true});
}
