import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/types";
import { createProvenanceShareToken } from "@/lib/provenance/share-token";

const Body = z.object({
  mode: z.enum(["winery", "trade"]),
  title: z.string().min(1),
  region: z.string().min(1),
  batch: z.string().min(1),
  status: z.string().min(1),
  evidence: z.array(z.string()).default([]),
  timeline: z.array(z.string()).default([]),
  uploadedEvidence: z.array(z.string()).default([]),
});

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user, "report:read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const token = createProvenanceShareToken(parsed.data);
  const url = new URL(`/provenance/scan/${encodeURIComponent(token)}`, request.url);
  return NextResponse.json({ url: url.toString() });
}
