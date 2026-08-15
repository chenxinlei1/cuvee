import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/session";
import { deleteReport, writeAuditLog } from "@/lib/auth/db";
export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){
  const user=await currentUser(); if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {id}=await params; const deleted=await deleteReport(user,id); if(!deleted)return NextResponse.json({error:"Not found"},{status:404});
  await writeAuditLog(user.id,"report.delete","report",id); return NextResponse.json({ok:true});
}
