import { NextResponse } from "next/server";
import { z } from "zod";
import { analyze } from "@/lib/agents/orchestrator";
import { SponsorUnavailableError } from "@/lib/utils";
import { currentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/types";
import { writeAuditLog } from "@/lib/auth/db";

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
    await writeAuditLog(user.id, "analysis.denied", "analysis");
    return NextResponse.json({ error: "Forbidden: analysis:run permission required" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const result = await analyze(parsed.data, { signal: req.signal, ownerId: user.id });
    await writeAuditLog(user.id, "analysis.run", "analysis", undefined, {
      region: parsed.data.region.id,
      persona: parsed.data.persona,
      year: parsed.data.timeframe.start.slice(0, 4),
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof SponsorUnavailableError) {
      return NextResponse.json({ error: err.message, sponsor: err.sponsor }, { status: 503 });
    }
    console.error("[/api/analyze]", err);
    return NextResponse.json({ error: "Analyze call failed" }, { status: 500 });
  }
}
