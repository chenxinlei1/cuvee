import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/types";
import { listDocuments, saveDocument, writeAuditLog } from "@/lib/auth/db";
import { increment } from "@/lib/observability/metrics";
import { log } from "@/lib/observability/logger";
const Body=z.object({name:z.string().min(1).max(200),size:z.number().int().max(100*1024),mime:z.string().max(120),content:z.string().max(100*1024)});
export async function GET(){const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});if(!hasPermission(user,"document:manage"))return NextResponse.json({error:"Forbidden"},{status:403});return NextResponse.json({documents:await listDocuments(user)});}
export async function POST(request:Request){const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});if(!hasPermission(user,"document:manage"))return NextResponse.json({error:"Forbidden"},{status:403});const parsed=Body.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Invalid document"},{status:400});const hash=createHash("sha256").update(parsed.data.content).digest("hex");const document=await saveDocument(user,parsed.data,hash);await writeAuditLog(user.id,"document.upload","document",document.id,{name:document.name,organizationId:user.organizationId});increment("cuvee_documents_uploaded_total","Documents uploaded");log("info","document.uploaded",{userId:user.id,documentId:document.id,organizationId:user.organizationId});return NextResponse.json({document},{status:201});}
