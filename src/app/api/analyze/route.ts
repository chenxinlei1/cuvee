import { NextResponse } from "next/server";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { currentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/types";
import { writeAuditLog } from "@/lib/auth/db";
import { increment } from "@/lib/observability/metrics";
import { log } from "@/lib/observability/logger";
import { insertAnalysisTask } from "@/lib/tasks/store";
import { ensureWorkerStarted } from "@/lib/tasks/worker";

export const runtime = "nodejs";

const Body = z.object({
  region: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    parent: z.enum(["burgundy", "bordeaux"]),
  }),
  timeframe: z.object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  persona: z.enum(["vineyard", "trade"]),
  locale: z.enum(["en", "fr", "zh"]).default("en"),
  tradePersona: z.enum(["merchant", "restaurant", "wineshop"]).optional(),
  question: z.string().max(500).optional(),
  chateau: z.string().max(120).optional(),
  uploads: z
    .array(
      z.object({
        name: z.string().max(200),
        size: z.number().int().min(0).max(100 * 1024),
        mime: z.string().max(120),
        content: z.string().max(100 * 1024).optional(),
      }),
    )
    .max(5)
    .optional(),
});

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user, "analysis:run")) {
    increment("cuvee_authorization_denials_total","Authorization denials");
    await writeAuditLog(user.id, "analysis.denied", "analysis");
    return NextResponse.json({ error: "Forbidden: analysis:run permission required" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const taskId = await insertAnalysisTask(user, parsed.data);
    ensureWorkerStarted();
    increment("cuvee_tasks_submitted_total", "Analysis tasks submitted");
    log("info", "analysis.submitted", {
      taskId,
      userId: user.id,
      organizationId: user.organizationId,
      persona: parsed.data.persona,
    });
    await writeAuditLog(user.id, "analysis.submitted", "analysis", taskId, {
      region: parsed.data.region.id,
      persona: parsed.data.persona,
      year: parsed.data.timeframe.start.slice(0, 4),
    });
    return NextResponse.json({ taskId }, { status: 202 });
  } catch (err) {
    increment("cuvee_tasks_submit_errors_total", "Analysis task submission failures");
    log("error", "analysis.submit_failed", {
      userId: user.id,
      error: err instanceof Error ? err.message : String(err),
    });
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
      extra: {
        region: parsed.data.region.id,
        persona: parsed.data.persona,
        year: parsed.data.timeframe.start.slice(0, 4),
        userId: user.id,
      },
    });
    return NextResponse.json({ error: "Failed to queue analysis" }, { status: 500 });
  }
}
