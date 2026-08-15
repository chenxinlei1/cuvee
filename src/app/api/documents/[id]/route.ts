import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/types";
import { deleteDocument, writeAuditLog } from "@/lib/auth/db";
export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});if(!hasPermission(user,"document:manage"))return NextResponse.json({error:"Forbidden"},{status:403});const{id}=await params;const deleted=await deleteDocument(user,id);if(!deleted)return NextResponse.json({error:"Not found"},{status:404});await writeAuditLog(user.id,"document.delete","document",id);return NextResponse.json({ok:true});}
