import { NextResponse } from "next/server";
import { sponsors, isDemoMode } from "@/lib/env";
import { databaseHealth } from "@/lib/auth/db";
import { gauge } from "@/lib/observability/metrics";

export const runtime = "nodejs";

export async function GET() {
  const database=await databaseHealth();gauge("cuvee_database_up","PostgreSQL connection health",database?1:0);
  return NextResponse.json({
    ok: database,
    database,
    demoMode: isDemoMode,
    sponsors,
    timestamp: new Date().toISOString(),
  },{status:database?200:503});
}
