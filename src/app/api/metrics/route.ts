import { NextResponse } from "next/server";
import { renderMetrics } from "@/lib/observability/metrics";
import { gauge } from "@/lib/observability/metrics";
export const runtime="nodejs";
export async function GET(request:Request){
  const configured=process.env.CUVEE_METRICS_TOKEN;
  if(configured&&request.headers.get("authorization")!==`Bearer ${configured}`)return NextResponse.json({error:"Unauthorized"},{status:401});
  const memory=process.memoryUsage();
  gauge("cuvee_process_uptime_seconds","Process uptime",Math.floor(process.uptime()));
  gauge("cuvee_process_heap_used_bytes","Node.js heap used",memory.heapUsed);
  gauge("cuvee_process_rss_bytes","Node.js resident set size",memory.rss);
  return new Response(renderMetrics(),{headers:{"content-type":"text/plain; version=0.0.4","cache-control":"no-store"}});
}
