import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/session";
import { listOrganizationTargets, listShareTargets } from "@/lib/auth/db";
export async function GET(){const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});if(user.role==="viewer")return NextResponse.json({error:"Forbidden"},{status:403});const[users,organizations]=await Promise.all([listShareTargets(),listOrganizationTargets()]);return NextResponse.json({users,organizations});}
