import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/session";
import { canDownloadReport, writeAuditLog } from "@/lib/auth/db";
import { createDownloadToken } from "@/lib/reports/download-token";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});const{id}=await params;if(!await canDownloadReport(user,id))return NextResponse.json({error:"Forbidden"},{status:403});const token=createDownloadToken(id,user.id);const url=new URL(`/api/reports/${id}/download?token=${encodeURIComponent(token)}`,request.url);await writeAuditLog(user.id,"report.download_link_created","report",id);return NextResponse.json({url:url.toString(),expiresIn:300});}
