import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/session";
import { listReportAccessLogs } from "@/lib/auth/db";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});const{id}=await params;const logs=await listReportAccessLogs(user,id);return logs?NextResponse.json({logs}):NextResponse.json({error:"Forbidden"},{status:403});}
