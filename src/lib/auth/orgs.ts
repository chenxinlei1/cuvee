import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { createAuthTokenWithClient, getPool, transaction, writeAuditLog } from "./db";
import {
  canManageOrganization,
  hasPermission,
  organizationAdminRole,
  rolesAllowedForOrganization,
} from "./types";
import type { AuthUser, OrganizationType, Role } from "./types";

export class OrgError extends Error {
  constructor(
    public code:
      | "FORBIDDEN"
      | "ORG_NOT_FOUND"
      | "ORG_EXISTS"
      | "EMAIL_EXISTS"
      | "ROLE_NOT_ALLOWED"
      | "MEMBER_NOT_FOUND"
      | "SELF_OPERATION"
      | "LAST_ADMIN",
    message: string,
  ) {
    super(message);
    this.name = "OrgError";
  }
}

export interface OrganizationRow {
  id: string;
  name: string;
  type: OrganizationType;
  createdAt: number;
  memberCount: number;
}

export interface OrgMember {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: string;
  organizationType: OrganizationType;
  organizationName: string;
  createdAt: number;
}

async function requireManageableOrganization(actor: AuthUser, orgId: string) {
  if (!canManageOrganization(actor, orgId))
    throw new OrgError("FORBIDDEN", "You cannot manage this organization");
  const row = await getPool().query<{ id: string; name: string; type: OrganizationType }>(
    "SELECT id,name,type FROM organizations WHERE id=$1",
    [orgId],
  );
  if (!row.rows[0]) throw new OrgError("ORG_NOT_FOUND", "Organization not found");
  return row.rows[0];
}

/** Platform admins see every organization; org admins see their own. */
export async function listOrganizationsFor(actor: AuthUser): Promise<OrganizationRow[]> {
  const platform = hasPermission(actor, "user:manage");
  const result = await getPool().query<{
    id: string;
    name: string;
    type: OrganizationType;
    created_at: string | number;
    member_count: string | number;
  }>(
    `SELECT o.id,o.name,o.type,o.created_at,count(om.user_id) member_count
     FROM organizations o LEFT JOIN organization_members om ON om.organization_id=o.id
     ${platform ? "" : "WHERE o.id=$1"}
     GROUP BY o.id ORDER BY o.created_at ASC`,
    platform ? [] : [actor.organizationId ?? ""],
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    createdAt: Number(row.created_at),
    memberCount: Number(row.member_count),
  }));
}

export async function createOrganization(
  actor: AuthUser,
  name: string,
  type: OrganizationType,
): Promise<OrganizationRow> {
  if (!hasPermission(actor, "user:manage"))
    throw new OrgError("FORBIDDEN", "Only platform admins can create organizations");
  const now = Date.now();
  const id = randomUUID();
  const result = await getPool().query<{ id: string }>(
    `INSERT INTO organizations(id,name,type,created_at) VALUES($1,$2,$3,$4)
     ON CONFLICT(type,name) DO NOTHING RETURNING id`,
    [id, name.trim(), type, now],
  );
  if (!result.rows[0])
    throw new OrgError("ORG_EXISTS", "An organization with this name and type already exists");
  await writeAuditLog(actor.id, "org.create", "organization", id, { name, type });
  return { id, name: name.trim(), type, createdAt: now, memberCount: 0 };
}

export async function listOrganizationMembers(
  actor: AuthUser,
  orgId: string,
): Promise<OrgMember[]> {
  if (!canManageOrganization(actor, orgId))
    throw new OrgError("FORBIDDEN", "You cannot manage this organization");
  const result = await getPool().query<{
    id: string;
    email: string;
    name: string;
    role: Role;
    status: string;
    organization_type: OrganizationType;
    organization_name: string;
    created_at: string | number;
  }>(
    `SELECT u.id,u.email,u.name,ar.key role,u.status,o.type organization_type,o.name organization_name,u.created_at
     FROM organization_members om
     JOIN users u ON u.id=om.user_id
     JOIN user_roles ur ON ur.user_id=u.id AND ur.organization_id=om.organization_id
     JOIN access_roles ar ON ar.id=ur.role_id
     JOIN organizations o ON o.id=om.organization_id
     WHERE om.organization_id=$1 ORDER BY u.created_at ASC`,
    [orgId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    status: row.status,
    organizationType: row.organization_type,
    organizationName: row.organization_name,
    createdAt: Number(row.created_at),
  }));
}

export interface InvitedMember {
  userId: string;
  token: string;
  email: string;
  name: string;
  role: Role;
  status: "pending";
}

/** Create a pending member and return an invite token (7-day validity). */
export async function inviteOrganizationMember(
  actor: AuthUser,
  orgId: string,
  input: { email: string; name: string; role: Role },
): Promise<InvitedMember> {
  const org = await requireManageableOrganization(actor, orgId);
  const roleAllowed =
    rolesAllowedForOrganization(org.type).includes(input.role) ||
    (input.role === "platformAdmin" && hasPermission(actor, "user:manage"));
  if (!roleAllowed)
    throw new OrgError("ROLE_NOT_ALLOWED", "Role is not allowed for this organization");

  const userId = randomUUID();
  const now = Date.now();
  let token: string;
  try {
    token = await transaction(async (client) => {
      await client.query(
        `INSERT INTO users(id,email,name,password_hash,role,status,organization_type,organization_name,created_at,email_verified_at)
         VALUES($1,$2,$3,'!',$4,'pending',$5,$6,$7,$7)`,
        [
          userId,
          input.email.trim().toLowerCase(),
          input.name.trim(),
          input.role,
          org.type,
          org.name,
          now,
        ],
      );
      await client.query(
        "INSERT INTO organization_members(organization_id,user_id,created_at) VALUES($1,$2,$3)",
        [orgId, userId, now],
      );
      await client.query(
        "INSERT INTO user_roles(user_id,role_id,organization_id,created_at) SELECT $1,id,$2,$3 FROM access_roles WHERE key=$4",
        [userId, orgId, now, input.role],
      );
      return createAuthTokenWithClient(client, userId, "invite", 7 * 24 * 60 * 60_000);
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505")
      throw new OrgError("EMAIL_EXISTS", "A user with this email already exists");
    throw error;
  }
  await writeAuditLog(actor.id, "org.invite", "user", userId, {
    organizationId: orgId,
    role: input.role,
    email: input.email.toLowerCase(),
  });
  return {
    userId,
    token,
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    role: input.role,
    status: "pending",
  };
}

export async function cancelPendingOrganizationInvite(userId: string): Promise<void> {
  await transaction(async (client) => {
    await client.query(
      `DELETE FROM users
       WHERE id=$1 AND status='pending' AND password_hash='!'
         AND EXISTS (
           SELECT 1 FROM auth_tokens
           WHERE user_id=users.id AND type='invite' AND used_at IS NULL
         )`,
      [userId],
    );
  });
}

async function memberRow(client: PoolClient, orgId: string, userId: string) {
  const result = await client.query<{ role: Role; type: OrganizationType; status: string }>(
    `SELECT ar.key role,o.type,u.status FROM organization_members om
     JOIN users u ON u.id=om.user_id
     JOIN user_roles ur ON ur.user_id=u.id AND ur.organization_id=om.organization_id
     JOIN access_roles ar ON ar.id=ur.role_id
     JOIN organizations o ON o.id=om.organization_id
     WHERE om.organization_id=$1 AND u.id=$2
     FOR UPDATE OF u`,
    [orgId, userId],
  );
  return result.rows[0];
}

async function assertAdminRemains(
  client: PoolClient,
  orgId: string,
  member: { role: Role; type: OrganizationType; status: string },
  patch: { role?: Role; status?: "pending" | "active" | "disabled" },
): Promise<void> {
  const adminRole = organizationAdminRole(member.type);
  if (!adminRole) throw new OrgError("ROLE_NOT_ALLOWED", "Organization type has no admin role");
  const removesActiveAdmin =
    member.role === adminRole &&
    member.status === "active" &&
    ((patch.role !== undefined && patch.role !== adminRole) ||
      (patch.status !== undefined && patch.status !== "active"));
  if (!removesActiveAdmin) return;
  const result = await client.query<{ count: string }>(
    `SELECT count(*) count FROM organization_members om
     JOIN users u ON u.id=om.user_id
     JOIN user_roles ur ON ur.user_id=u.id AND ur.organization_id=om.organization_id
     JOIN access_roles ar ON ar.id=ur.role_id
     WHERE om.organization_id=$1 AND u.status='active' AND ar.key=$2`,
    [orgId, adminRole],
  );
  if (Number(result.rows[0]?.count ?? 0) <= 1)
    throw new OrgError("LAST_ADMIN", "The organization must retain an active administrator");
}

export async function updateOrganizationMember(
  actor: AuthUser,
  orgId: string,
  userId: string,
  patch: { role?: Role; status?: "pending" | "active" | "disabled" },
): Promise<boolean> {
  const org = await requireManageableOrganization(actor, orgId);
  if (patch.role !== undefined) {
    const roleAllowed =
      rolesAllowedForOrganization(org.type).includes(patch.role) ||
      (patch.role === "platformAdmin" && hasPermission(actor, "user:manage"));
    if (!roleAllowed)
      throw new OrgError("ROLE_NOT_ALLOWED", "Role is not allowed for this organization");
  }
  await transaction(async (client) => {
    const member = await memberRow(client, orgId, userId);
    if (!member) throw new OrgError("MEMBER_NOT_FOUND", "Member not found");
    await client.query("SELECT id FROM organizations WHERE id=$1 FOR UPDATE", [orgId]);
    if (userId === actor.id && (patch.role !== undefined || patch.status !== undefined))
      throw new OrgError("SELF_OPERATION", "You cannot change your own role or status");
    if (member.role === "platformAdmin" && !hasPermission(actor, "user:manage"))
      throw new OrgError("FORBIDDEN", "You cannot modify a platform admin");
    await assertAdminRemains(client, orgId, member, patch);
    if (patch.role !== undefined) {
      await client.query("UPDATE users SET role=$1 WHERE id=$2", [patch.role, userId]);
      await client.query("DELETE FROM user_roles WHERE user_id=$1", [userId]);
      await client.query(
        "INSERT INTO user_roles(user_id,role_id,organization_id,created_at) SELECT $1,id,$2,$3 FROM access_roles WHERE key=$4",
        [userId, orgId, Date.now(), patch.role],
      );
    }
    if (patch.status !== undefined) {
      await client.query("UPDATE users SET status=$1 WHERE id=$2", [patch.status, userId]);
      if (patch.status !== "active")
        await client.query(
          "UPDATE sessions SET revoked_at=$1 WHERE user_id=$2 AND revoked_at IS NULL",
          [Date.now(), userId],
        );
    }
  });
  await writeAuditLog(actor.id, "org.member_updated", "user", userId, {
    organizationId: orgId,
    ...patch,
  });
  return true;
}

export async function disableOrganizationMember(
  actor: AuthUser,
  orgId: string,
  userId: string,
): Promise<boolean> {
  await requireManageableOrganization(actor, orgId);
  const now = Date.now();
  await transaction(async (client) => {
    const member = await memberRow(client, orgId, userId);
    if (!member) throw new OrgError("MEMBER_NOT_FOUND", "Member not found");
    await client.query("SELECT id FROM organizations WHERE id=$1 FOR UPDATE", [orgId]);
    if (userId === actor.id) throw new OrgError("SELF_OPERATION", "You cannot disable yourself");
    if (member.role === "platformAdmin" && !hasPermission(actor, "user:manage"))
      throw new OrgError("FORBIDDEN", "You cannot modify a platform admin");
    await assertAdminRemains(client, orgId, member, { status: "disabled" });
    await client.query("UPDATE users SET status='disabled' WHERE id=$1", [userId]);
    await client.query(
      "UPDATE sessions SET revoked_at=$1 WHERE user_id=$2 AND revoked_at IS NULL",
      [now, userId],
    );
  });
  await writeAuditLog(actor.id, "org.member_disabled", "user", userId, {
    organizationId: orgId,
  });
  return true;
}
