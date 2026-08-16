import dotenv from "dotenv";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import {
  canDownloadReport,
  closeDatabase,
  findReportForUser,
  findUserById,
  listReportAccessLogs,
  listReports,
  recordReportAccess,
  setReportGrant,
  setReportVisibility,
} from "../src/lib/auth/db";

dotenv.config({ path: ".env.local" });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");
  const pool = new Pool({ connectionString: url });
  const reportIds: string[] = [];
  const userIds: string[] = [];
  try {
    const members = (
      await pool.query<{ id: string; organization_id: string }>(
        "SELECT u.id, om.organization_id FROM users u JOIN organization_members om ON om.user_id = u.id WHERE u.status='active' ORDER BY u.created_at",
      )
    ).rows;
    const ownerRow = members[0];
    const externalRow = members.find(
      (row) => row.organization_id !== ownerRow?.organization_id,
    );
    assert(ownerRow && externalRow, "two organizations required");
    const owner = await findUserById(ownerRow.id);
    const external = await findUserById(externalRow.id);
    assert(owner && external, "owner and external users must load");
    assert(owner.organizationId && external.organizationId, "organizations required");

    const now = Date.now();
    const insertReport = async (visibility: "private" | "restricted" | "workspace") => {
      const id = randomUUID();
      reportIds.push(id);
      await pool.query(
        `INSERT INTO reports(id,owner_id,organization_id,region_id,region_name,vintage,risk_score,result_json,generated_at,created_at,updated_at,visibility)
         VALUES($1,$2,$3,'authz','Authorization Test','2099',1,$4,$5,$6,$6,$7)`,
        [id, owner.id, owner.organizationId, {}, `authz-${id}`, now, visibility],
      );
      return id;
    };

    // ── private → restricted user grant → revoke ──────────────────────────
    const id = await insertReport("private");
    assert(!(await listReports(external)).some((r) => r.id === id), "private report leaked");
    assert.equal(await findReportForUser(external, id), null, "private report must not resolve");
    assert.equal(await canDownloadReport(external, id), false);

    assert(await setReportVisibility(owner, id, "restricted"));
    assert(
      await setReportGrant(owner, id, {
        targetKind: "user",
        targetValue: external.id,
        expiresAt: Date.now() + 60_000,
        canDownload: true,
        shared: true,
      }),
    );
    const visible = (await listReports(external)).find((r) => r.id === id);
    assert(visible?.canDownload, "explicit downloadable grant missing");
    assert.equal((await findReportForUser(external, id))?.canDownload, true);
    assert.equal(await canDownloadReport(external, id), true);

    // Downgrade to view-only: still visible, download blocked.
    assert(
      await setReportGrant(owner, id, {
        targetKind: "user",
        targetValue: external.id,
        expiresAt: Date.now() + 60_000,
        canDownload: false,
        shared: true,
      }),
    );
    assert.equal((await findReportForUser(external, id))?.canDownload, false);
    assert.equal(await canDownloadReport(external, id), false);

    assert(
      await setReportGrant(owner, id, {
        targetKind: "user",
        targetValue: external.id,
        expiresAt: null,
        canDownload: false,
        shared: false,
      }),
    );
    assert(!(await listReports(external)).some((r) => r.id === id), "revoked report remained visible");

    // ── organization grant + expiry ────────────────────────────────────────
    assert(
      await setReportGrant(owner, id, {
        targetKind: "organization",
        targetValue: external.organizationId,
        expiresAt: Date.now() + 60_000,
        canDownload: true,
        shared: true,
      }),
    );
    assert((await listReports(external)).some((r) => r.id === id), "organization grant not applied");
    assert.equal(await canDownloadReport(external, id), true);

    assert(
      await setReportGrant(owner, id, {
        targetKind: "organization",
        targetValue: external.organizationId,
        expiresAt: Date.now() - 1000,
        canDownload: true,
        shared: true,
      }),
    );
    assert(
      !(await listReports(external)).some((r) => r.id === id),
      "expired grant must hide the report",
    );

    // ── workspace visibility for same-organization members ────────────────
    const colleagueId = randomUUID();
    userIds.push(colleagueId);
    await pool.query(
      "INSERT INTO users(id,email,name,password_hash,role,status,organization_type,organization_name,created_at,email_verified_at)VALUES($1,$2,$3,'test:test','wineryStaff','active','chateau','Test Château',$4,$4)",
      [colleagueId, `authz-colleague-${colleagueId}@test.local`, "Authz Colleague", now],
    );
    await pool.query(
      "INSERT INTO organization_members(organization_id,user_id,created_at)VALUES($1,$2,$3)",
      [owner.organizationId, colleagueId, now],
    );
    await pool.query(
      "INSERT INTO user_roles(user_id,role_id,organization_id,created_at)SELECT $1,id,$2,$3 FROM access_roles WHERE key='wineryStaff'",
      [colleagueId, owner.organizationId, now],
    );
    const colleague = await findUserById(colleagueId);
    assert(colleague, "colleague must load");

    assert(await setReportVisibility(owner, id, "workspace"));
    assert((await listReports(colleague)).some((r) => r.id === id), "workspace report hidden from member");
    assert(!(await listReports(external)).some((r) => r.id === id), "workspace report leaked across organizations");
    assert(await setReportVisibility(owner, id, "private"));
    assert(!(await listReports(colleague)).some((r) => r.id === id), "private report visible to member");

    // ── access log: managers see it, grantees do not ──────────────────────
    await recordReportAccess({
      reportId: id,
      userId: external.id,
      action: "view",
      userAgent: "test-agent",
    });
    const ownerLogs = await listReportAccessLogs(owner, id);
    assert(Array.isArray(ownerLogs) && ownerLogs.length >= 1, "owner access log missing");
    assert.equal(await listReportAccessLogs(external, id), null, "grantee must not see access log");

    console.log("Report authorization checks passed.");
  } finally {
    if (reportIds.length)
      await pool.query("DELETE FROM reports WHERE id=ANY($1::uuid[])", [reportIds]);
    if (userIds.length)
      await pool.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [userIds]);
    await Promise.all([pool.end(), closeDatabase()]);
  }
}

void main();
