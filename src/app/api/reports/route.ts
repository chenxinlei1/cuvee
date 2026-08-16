import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/types";
import { listReports, saveReport, writeAuditLog } from "@/lib/auth/db";
import { increment } from "@/lib/observability/metrics";
import { log } from "@/lib/observability/logger";

const Body = z.object({ result: z.record(z.unknown()) });
export async function GET() {
  const user=await currentUser(); if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!hasPermission(user,"report:read"))return NextResponse.json({error:"Forbidden"},{status:403});
  return NextResponse.json({ reports: await listReports(user) });
}
export async function POST(request:Request){
  const user=await currentUser(); if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!hasPermission(user,"analysis:run"))return NextResponse.json({error:"Forbidden"},{status:403});
  const parsed=Body.safeParse(await request.json().catch(()=>null)); if(!parsed.success)return NextResponse.json({error:"Invalid report"},{status:400});
  const result=parsed.data.result as never; const id=await saveReport(user,result); await writeAuditLog(user.id,"report.save","report",id,{organizationId:user.organizationId});
  increment("cuvee_reports_saved_total","Reports saved to history");
  log("info","report.saved",{userId:user.id,reportId:id,organizationId:user.organizationId});
  return NextResponse.json({id},{status:201});
}
