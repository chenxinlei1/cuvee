import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/types";
import { createOrganization, listOrganizationsFor, OrgError } from "@/lib/auth/orgs";
import { isSameOrigin } from "@/lib/auth/request-security";

export const runtime = "nodejs";

const CreateBody = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.enum(["chateau", "negociant", "distributor", "buyer"]),
});

function orgError(error: unknown) {
  if (error instanceof OrgError) {
    const status =
      error.code === "FORBIDDEN"
        ? 403
        : error.code === "ORG_EXISTS"
          ? 409
          : error.code === "ORG_NOT_FOUND"
            ? 404
            : error.code === "EMAIL_EXISTS"
              ? 409
              : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json({ error: "Organization operation failed" }, { status: 500 });
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user, "user:manage") && !hasPermission(user, "user:manage:organization"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ organizations: await listOrganizationsFor(user) });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user, "user:manage"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = CreateBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid organization" }, { status: 400 });
  try {
    return NextResponse.json(
      { organization: await createOrganization(user, parsed.data.name, parsed.data.type) },
      { status: 201 },
    );
  } catch (error) {
    return orgError(error);
  }
}
