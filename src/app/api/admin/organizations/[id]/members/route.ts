import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/types";
import {
  cancelPendingOrganizationInvite,
  inviteOrganizationMember,
  listOrganizationMembers,
  OrgError,
} from "@/lib/auth/orgs";
import { sendAuthMail } from "@/lib/auth/mail";
import { increment } from "@/lib/observability/metrics";
import { isSameOrigin } from "@/lib/auth/request-security";

export const runtime = "nodejs";

const InviteBody = z.object({
  email: z.string().email(),
  name: z.string().trim().min(2).max(80),
  role: z.enum(["platformAdmin", "wineryAdmin", "wineryStaff", "buyerAdmin", "buyerStaff"]),
});

function orgError(error: unknown) {
  if (error instanceof OrgError) {
    const status =
      error.code === "FORBIDDEN"
        ? 403
        : error.code === "ORG_NOT_FOUND" || error.code === "MEMBER_NOT_FOUND"
          ? 404
          : error.code === "EMAIL_EXISTS"
            ? 409
            : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json({ error: "Organization operation failed" }, { status: 500 });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user, "user:manage") && !hasPermission(user, "user:manage:organization"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  try {
    return NextResponse.json({ members: await listOrganizationMembers(user, id) });
  } catch (error) {
    return orgError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request))
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user, "user:manage") && !hasPermission(user, "user:manage:organization"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = InviteBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid invite" }, { status: 400 });
  const { id } = await params;
  try {
    const invited = await inviteOrganizationMember(user, id, parsed.data);
    const url = new URL(
      `/reset-password?token=${encodeURIComponent(invited.token)}`,
      request.url,
    ).toString();
    try {
      await sendAuthMail({ to: invited.email, name: invited.name, url, kind: "invite" });
    } catch (error) {
      await cancelPendingOrganizationInvite(invited.userId);
      throw error;
    }
    increment("cuvee_org_invites_total", "Organization invites sent");
    return NextResponse.json(
      {
        invited: {
          userId: invited.userId,
          email: invited.email,
          name: invited.name,
          role: invited.role,
          status: invited.status,
        },
        ...(process.env.NODE_ENV !== "production" ? { devUrl: url } : {}),
      },
      { status: 201 },
    );
  } catch (error) {
    return orgError(error);
  }
}
