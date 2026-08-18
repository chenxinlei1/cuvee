import dotenv from "dotenv";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import {
  authenticate,
  closeDatabase,
  consumeSetupToken,
  createUser,
  findUserById,
  userStatusByEmail,
} from "../src/lib/auth/db";
import {
  createOrganization,
  disableOrganizationMember,
  inviteOrganizationMember,
  listOrganizationsFor,
  OrgError,
  updateOrganizationMember,
} from "../src/lib/auth/orgs";
import { hasPermission } from "../src/lib/auth/types";

dotenv.config({ path: ".env.local" });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");
  const pool = new Pool({ connectionString: url });
  const userIds: string[] = [];
  const orgIds: string[] = [];
  try {
    const members = (
      await pool.query<{
        id: string;
        organization_id: string;
        organization_type: string;
        role: string;
      }>(
        `SELECT u.id, om.organization_id, o.type organization_type, u.role
         FROM users u JOIN organization_members om ON om.user_id=u.id
         JOIN organizations o ON o.id=om.organization_id
         WHERE u.status='active' ORDER BY u.created_at`,
      )
    ).rows;
    const wineryRow = members.find(
      (row) => row.organization_type === "chateau" && row.role === "wineryAdmin",
    );
    const buyerRow = members.find(
      (row) => row.organization_type === "buyer" && row.role === "buyerAdmin",
    );
    assert(wineryRow && buyerRow, "a chateau and a buyer organization are required");
    const winery = await findUserById(wineryRow.id);
    const buyer = await findUserById(buyerRow.id);
    assert(winery && buyer, "users must load");

    // ── temp platform admin ──────────────────────────────────────────────
    const adminId = randomUUID();
    userIds.push(adminId);
    const now = Date.now();
    await pool.query(
      "INSERT INTO users(id,email,name,password_hash,role,status,organization_type,organization_name,created_at,email_verified_at)VALUES($1,$2,$3,'test:test','platformAdmin','active','buyer','Admin Org',$4,$4)",
      [adminId, `org-admin-${adminId}@test.local`, "Org Admin", now],
    );
    await pool.query(
      "INSERT INTO organization_members(organization_id,user_id,created_at)VALUES($1,$2,$3)",
      [buyer.organizationId, adminId, now],
    );
    await pool.query(
      "INSERT INTO user_roles(user_id,role_id,organization_id,created_at)SELECT $1,id,$2,$3 FROM access_roles WHERE key='platformAdmin'",
      [adminId, buyer.organizationId, now],
    );
    const platform = await findUserById(adminId);
    assert(platform && hasPermission(platform, "user:manage"), "platform admin must load");

    // Self-registration creates a pending user, but must still return the
    // created identity so the route can issue an email-verification token.
    const registrationOrg = `Registration Org ${randomUUID().slice(0, 8)}`;
    const registered = await createUser({
      email: `registration-${randomUUID().slice(0, 8)}@test.local`,
      name: "Pending Registration",
      password: "registration-password",
      role: "buyerStaff",
      status: "pending",
      organizationType: "buyer",
      organizationName: registrationOrg,
      emailVerified: false,
    });
    userIds.push(registered.id);
    if (registered.organizationId) orgIds.push(registered.organizationId);
    assert.equal(registered.status, "pending");
    assert.equal(await userStatusByEmail(registered.email), "pending");
    assert.equal(await findUserById(registered.id), null, "pending user must not authenticate");

    // ── scoping: org admins see only their own organization ───────────────
    const wineryOrgs = await listOrganizationsFor(winery);
    assert(wineryOrgs.length === 1 && wineryOrgs[0]?.id === winery.organizationId);
    const platformOrgs = await listOrganizationsFor(platform);
    assert(platformOrgs.some((org) => org.id === winery.organizationId));
    assert(platformOrgs.some((org) => org.id === buyer.organizationId));

    // ── create organization (platform only) ───────────────────────────────
    const created = await createOrganization(
      platform,
      `Test Org ${randomUUID().slice(0, 8)}`,
      "buyer",
    );
    orgIds.push(created.id);
    assert((await listOrganizationsFor(platform)).some((org) => org.id === created.id));
    await assert.rejects(
      () => createOrganization(platform, created.name, created.type),
      (error: unknown) => error instanceof OrgError && error.code === "ORG_EXISTS",
    );
    await assert.rejects(
      () => createOrganization(winery, "Nope", "buyer"),
      (error: unknown) => error instanceof OrgError && error.code === "FORBIDDEN",
    );

    // ── invite: role constraints + cross-org isolation ────────────────────
    const invited = await inviteOrganizationMember(winery, winery.organizationId!, {
      email: `invitee-${randomUUID().slice(0, 8)}@test.local`,
      name: "Invitee",
      role: "wineryStaff",
    });
    userIds.push(invited.userId);
    assert.equal(await userStatusByEmail(invited.email), "pending");
    const pendingRow = (
      await pool.query<{ role: string; organization_id: string }>(
        `SELECT u.role, om.organization_id FROM users u
         JOIN organization_members om ON om.user_id=u.id WHERE u.id=$1`,
        [invited.userId],
      )
    ).rows[0];
    assert.equal(pendingRow?.role, "wineryStaff");
    assert.equal(pendingRow?.organization_id, winery.organizationId);

    await assert.rejects(
      () =>
        inviteOrganizationMember(winery, winery.organizationId!, {
          email: `bad-${randomUUID().slice(0, 8)}@test.local`,
          name: "Bad",
          role: "buyerAdmin",
        }),
      (error: unknown) => error instanceof OrgError && error.code === "ROLE_NOT_ALLOWED",
    );
    await assert.rejects(
      () =>
        inviteOrganizationMember(platform, winery.organizationId!, {
          email: `platform-bad-${randomUUID().slice(0, 8)}@test.local`,
          name: "Platform Bad",
          role: "buyerAdmin",
        }),
      (error: unknown) => error instanceof OrgError && error.code === "ROLE_NOT_ALLOWED",
    );
    await assert.rejects(
      () =>
        inviteOrganizationMember(winery, buyer.organizationId!, {
          email: `cross-${randomUUID().slice(0, 8)}@test.local`,
          name: "Cross",
          role: "buyerStaff",
        }),
      (error: unknown) => error instanceof OrgError && error.code === "FORBIDDEN",
    );
    await assert.rejects(
      () =>
        inviteOrganizationMember(winery, winery.organizationId!, {
          email: invited.email,
          name: "Dup",
          role: "wineryStaff",
        }),
      (error: unknown) => error instanceof OrgError && error.code === "EMAIL_EXISTS",
    );

    const platformInvite = await inviteOrganizationMember(platform, created.id, {
      email: `buyer-${randomUUID().slice(0, 8)}@test.local`,
      name: "Buyer",
      role: "buyerAdmin",
    });
    userIds.push(platformInvite.userId);

    // ── invite token activates the account on first password set ──────────
    const activated = await consumeSetupToken(invited.token, "invite-password-123456");
    assert.deepEqual(activated, { userId: invited.userId, type: "invite" });
    assert.equal(await userStatusByEmail(invited.email), "active");
    assert(
      await authenticate(invited.email, "invite-password-123456"),
      "invited member must be able to sign in after setting a password",
    );

    // ── member updates: role change, self-protection, isolation ───────────
    assert(
      await updateOrganizationMember(winery, winery.organizationId!, invited.userId, {
        role: "wineryAdmin",
      }),
    );
    assert.equal((await findUserById(invited.userId))?.role, "wineryAdmin");
    await assert.rejects(
      () =>
        updateOrganizationMember(winery, winery.organizationId!, invited.userId, {
          role: "platformAdmin",
        }),
      (error: unknown) => error instanceof OrgError && error.code === "ROLE_NOT_ALLOWED",
    );
    await assert.rejects(
      () =>
        updateOrganizationMember(winery, buyer.organizationId!, platformInvite.userId, {
          status: "disabled",
        }),
      (error: unknown) => error instanceof OrgError && error.code === "FORBIDDEN",
    );
    await assert.rejects(
      () =>
        updateOrganizationMember(winery, winery.organizationId!, winery.id, {
          role: "wineryStaff",
        }),
      (error: unknown) => error instanceof OrgError && error.code === "SELF_OPERATION",
    );

    // ── disable member + self-protection ──────────────────────────────────
    await disableOrganizationMember(winery, winery.organizationId!, invited.userId);
    assert.equal(await userStatusByEmail(invited.email), "disabled");
    await assert.rejects(
      () =>
        updateOrganizationMember(platform, winery.organizationId!, winery.id, {
          role: "wineryStaff",
        }),
      (error: unknown) => error instanceof OrgError && error.code === "LAST_ADMIN",
    );
    await assert.rejects(
      () => disableOrganizationMember(winery, winery.organizationId!, winery.id),
      (error: unknown) => error instanceof OrgError && error.code === "SELF_OPERATION",
    );
    await disableOrganizationMember(platform, created.id, platformInvite.userId);
    assert.equal(await userStatusByEmail(platformInvite.email), "disabled");

    console.log("Organization admin checks passed.");
  } finally {
    if (userIds.length) await pool.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [userIds]);
    if (orgIds.length)
      await pool.query("DELETE FROM organizations WHERE id=ANY($1::uuid[])", [orgIds]);
    await Promise.all([pool.end(), closeDatabase()]);
  }
}

void main();
