import "server-only";
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import type { AuthUser, OrganizationType, ReportVisibility, Role } from "./types";
import { canManageReport, hasPermission } from "./types";
import type { AnalyzeResult, UploadMeta } from "@/lib/wine/types";

let pool: Pool | undefined;
function getPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url)
    throw new Error(
      "DATABASE_URL is required. Run the PostgreSQL migration before starting Cuvée.",
    );
  return (pool ??= new Pool({ connectionString: url, max: 10, idleTimeoutMillis: 30_000 }));
}
async function rows<T extends QueryResultRow>(text: string, values: unknown[] = []): Promise<T[]> {
  return (await getPool().query<T>(text, values)).rows;
}
async function one<T extends QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<T | undefined> {
  return (await rows<T>(text, values))[0];
}
async function run(text: string, values: unknown[] = []): Promise<number> {
  return (await getPool().query(text, values)).rowCount ?? 0;
}
async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const value = await work(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
function passwordHash(password: string, salt = randomBytes(16).toString("hex")): string {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
function verifyPassword(password: string, stored: string): boolean {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64),
    expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
interface UserRow extends QueryResultRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: Role;
  organization_type: string | null;
  organization_name: string | null;
}
function rowUser(row: Omit<UserRow, "password_hash">): AuthUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    organizationType: (row.organization_type ?? undefined) as OrganizationType | undefined,
    organizationName: row.organization_name ?? undefined,
  };
}

export async function authenticate(email: string, password: string): Promise<AuthUser | null> {
  const row = await one<UserRow>(
    "SELECT id,email,name,password_hash,role,organization_type,organization_name FROM users WHERE lower(email)=lower($1) AND status='active'",
    [email],
  );
  return row && verifyPassword(password, row.password_hash) ? rowUser(row) : null;
}
export async function emailVerificationState(email: string): Promise<boolean | null> {
  const row = await one<{ email_verified_at: string | null }>(
    "SELECT email_verified_at FROM users WHERE lower(email)=lower($1)",
    [email],
  );
  return row ? row.email_verified_at !== null : null;
}
const LOGIN_WINDOW_MS = 15 * 60 * 1000,
  LOGIN_MAX_FAILURES = 5;
export async function loginRetryAfter(email: string): Promise<number> {
  const normalized = email.trim().toLowerCase(),
    cutoff = Date.now() - LOGIN_WINDOW_MS;
  await run("DELETE FROM login_attempts WHERE attempted_at<$1", [cutoff]);
  const attempts = await rows<{ attempted_at: string }>(
    "SELECT attempted_at FROM login_attempts WHERE email=$1 ORDER BY attempted_at DESC",
    [normalized],
  );
  const blocking = attempts[LOGIN_MAX_FAILURES - 1];
  return blocking
    ? Math.max(1, Math.ceil((Number(blocking.attempted_at) + LOGIN_WINDOW_MS - Date.now()) / 1000))
    : 0;
}
export async function recordLoginResult(email: string, succeeded: boolean): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (succeeded) await run("DELETE FROM login_attempts WHERE email=$1", [normalized]);
  else
    await run("INSERT INTO login_attempts(email,attempted_at)VALUES($1,$2)", [
      normalized,
      Date.now(),
    ]);
}
export async function userStatusByEmail(email: string): Promise<string | null> {
  return (
    (
      await one<{ status: string }>("SELECT status FROM users WHERE lower(email)=lower($1)", [
        email,
      ])
    )?.status ?? null
  );
}
export async function findUserById(id: string): Promise<AuthUser | null> {
  const row = await one<Omit<UserRow, "password_hash">>(
    "SELECT id,email,name,role,organization_type,organization_name FROM users WHERE id=$1 AND status='active'",
    [id],
  );
  return row ? rowUser(row) : null;
}
export async function listUsers(): Promise<
  Array<AuthUser & { status: string; createdAt: number }>
> {
  const data = await rows<Omit<UserRow, "password_hash"> & { status: string; created_at: string }>(
    "SELECT id,email,name,role,status,organization_type,organization_name,created_at FROM users ORDER BY created_at",
  );
  return data.map((r) => ({ ...rowUser(r), status: r.status, createdAt: Number(r.created_at) }));
}
export async function createUser(input: {
  email: string;
  name: string;
  password: string;
  role?: Role;
  status?: "pending" | "active" | "disabled";
  organizationType?: OrganizationType;
  organizationName?: string;
  emailVerified?: boolean;
}): Promise<AuthUser & { status: string; createdAt: number }> {
  const id = randomUUID(),
    createdAt = Date.now(),
    role = input.role ?? "buyerStaff",
    status = input.status ?? "pending";
  try {
    await run(
      "INSERT INTO users(id,email,name,password_hash,role,status,organization_type,organization_name,created_at,email_verified_at)VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [
        id,
        input.email.trim().toLowerCase(),
        input.name.trim(),
        passwordHash(input.password),
        role,
        status,
        input.organizationType ?? null,
        input.organizationName?.trim() || null,
        createdAt,
        input.emailVerified === false ? null : createdAt,
      ],
    );
  } catch (error) {
    if ((error as { code?: string }).code === "23505") throw new Error("EMAIL_EXISTS");
    throw error;
  }
  return {
    id,
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    role,
    status,
    organizationType: input.organizationType,
    organizationName: input.organizationName?.trim() || undefined,
    createdAt,
  };
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createAuthToken(
  userId: string,
  type: "email_verification" | "password_reset",
  ttlMs: number,
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await transaction(async (client) => {
    await client.query(
      "UPDATE auth_tokens SET used_at=$1 WHERE user_id=$2 AND type=$3 AND used_at IS NULL",
      [Date.now(), userId, type],
    );
    await client.query(
      "INSERT INTO auth_tokens(id,user_id,token_hash,type,expires_at,created_at) VALUES($1,$2,$3,$4,$5,$6)",
      [randomUUID(), userId, hashToken(token), type, Date.now() + ttlMs, Date.now()],
    );
  });
  return token;
}

export async function createAuthTokenByEmail(
  email: string,
  type: "email_verification" | "password_reset",
  ttlMs: number,
): Promise<{ token: string; user: { id: string; email: string; name: string } } | null> {
  const user = await one<{ id: string; email: string; name: string }>(
    "SELECT id,email,name FROM users WHERE lower(email)=lower($1) AND status<>'disabled'",
    [email],
  );
  if (!user) return null;
  return { token: await createAuthToken(user.id, type, ttlMs), user };
}

export async function consumeEmailVerificationToken(token: string): Promise<string | null> {
  return transaction(async (client) => {
    const result = await client.query<{ id: string; user_id: string }>(
      "SELECT id,user_id FROM auth_tokens WHERE token_hash=$1 AND type='email_verification' AND used_at IS NULL AND expires_at>$2 FOR UPDATE",
      [hashToken(token), Date.now()],
    );
    const row = result.rows[0];
    if (!row) return null;
    const now = Date.now();
    await client.query("UPDATE auth_tokens SET used_at=$1 WHERE id=$2", [now, row.id]);
    await client.query("UPDATE users SET email_verified_at=$1 WHERE id=$2", [now, row.user_id]);
    return row.user_id;
  });
}

export async function consumePasswordResetToken(token: string, newPassword: string): Promise<string | null> {
  return transaction(async (client) => {
    const result = await client.query<{ id: string; user_id: string }>(
      "SELECT id,user_id FROM auth_tokens WHERE token_hash=$1 AND type='password_reset' AND used_at IS NULL AND expires_at>$2 FOR UPDATE",
      [hashToken(token), Date.now()],
    );
    const row = result.rows[0];
    if (!row) return null;
    const now = Date.now();
    await client.query("UPDATE auth_tokens SET used_at=$1 WHERE id=$2", [now, row.id]);
    await client.query("UPDATE users SET password_hash=$1 WHERE id=$2", [passwordHash(newPassword), row.user_id]);
    await client.query("UPDATE sessions SET revoked_at=$1 WHERE user_id=$2 AND revoked_at IS NULL", [now, row.user_id]);
    return row.user_id;
  });
}

export async function createSession(userId: string, details: { userAgent?: string; ipAddress?: string; maxAgeSeconds: number }): Promise<string> {
  const token = randomBytes(32).toString("base64url"), now = Date.now();
  await run(
    "INSERT INTO sessions(id,user_id,token_hash,user_agent,ip_address,created_at,last_seen_at,expires_at) VALUES($1,$2,$3,$4,$5,$6,$6,$7)",
    [randomUUID(), userId, hashToken(token), details.userAgent ?? null, details.ipAddress ?? null, now, now + details.maxAgeSeconds * 1000],
  );
  return token;
}

export async function findUserBySession(token: string): Promise<AuthUser | null> {
  const now = Date.now();
  const row = await one<Omit<UserRow, "password_hash"> & { session_id: string }>(
    `SELECT u.id,u.email,u.name,u.role,u.organization_type,u.organization_name,s.id session_id
     FROM sessions s JOIN users u ON u.id=s.user_id
     WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>$2 AND u.status='active'`,
    [hashToken(token), now],
  );
  if (!row) return null;
  await run("UPDATE sessions SET last_seen_at=$1 WHERE id=$2 AND last_seen_at<$3", [now, row.session_id, now - 60_000]);
  return rowUser(row);
}

export async function revokeSession(token: string): Promise<void> {
  await run("UPDATE sessions SET revoked_at=$1 WHERE token_hash=$2 AND revoked_at IS NULL", [Date.now(), hashToken(token)]);
}

export async function revokeOtherSessions(userId: string, currentToken: string): Promise<number> {
  return run("UPDATE sessions SET revoked_at=$1 WHERE user_id=$2 AND token_hash<>$3 AND revoked_at IS NULL", [Date.now(), userId, hashToken(currentToken)]);
}

export async function listSessions(userId: string, currentToken: string) {
  const data = await rows<{ id: string; user_agent: string | null; ip_address: string | null; created_at: string; last_seen_at: string; expires_at: string; token_hash: string }>(
    "SELECT id,user_agent,ip_address,created_at,last_seen_at,expires_at,token_hash FROM sessions WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>$2 ORDER BY last_seen_at DESC",
    [userId, Date.now()],
  );
  const currentHash = hashToken(currentToken);
  return data.map((s) => ({ id: s.id, userAgent: s.user_agent, ipAddress: s.ip_address, createdAt: Number(s.created_at), lastSeenAt: Number(s.last_seen_at), expiresAt: Number(s.expires_at), current: s.token_hash === currentHash }));
}

export async function revokeSessionById(userId: string, sessionId: string): Promise<boolean> {
  return (await run("UPDATE sessions SET revoked_at=$1 WHERE id=$2 AND user_id=$3 AND revoked_at IS NULL", [Date.now(), sessionId, userId])) > 0;
}
export async function updateUser(
  id: string,
  patch: {
    role?: Role;
    status?: "pending" | "active" | "disabled";
    organizationType?: OrganizationType;
    organizationName?: string;
  },
): Promise<boolean> {
  return (
    (await run(
      "UPDATE users SET role=COALESCE($1,role),status=COALESCE($2,status),organization_type=COALESCE($3,organization_type),organization_name=COALESCE($4,organization_name)WHERE id=$5",
      [
        patch.role ?? null,
        patch.status ?? null,
        patch.organizationType ?? null,
        patch.organizationName ?? null,
        id,
      ],
    )) > 0
  );
}
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<boolean> {
  const row = await one<{ password_hash: string }>(
    "SELECT password_hash FROM users WHERE id=$1 AND status='active'",
    [userId],
  );
  if (!row || !verifyPassword(currentPassword, row.password_hash)) return false;
  return (
    (await run("UPDATE users SET password_hash=$1 WHERE id=$2", [
      passwordHash(newPassword),
      userId,
    ])) > 0
  );
}
export async function resetPassword(userId: string, newPassword: string): Promise<boolean> {
  return (
    (await run("UPDATE users SET password_hash=$1 WHERE id=$2", [
      passwordHash(newPassword),
      userId,
    ])) > 0
  );
}
export async function deleteUser(
  userId: string,
  replacementOwnerId: string,
): Promise<"deleted" | "not_found" | "last_admin"> {
  const user = await one<{ role: Role }>("SELECT role FROM users WHERE id=$1", [userId]);
  if (!user) return "not_found";
  if (
    user.role === "platformAdmin" &&
    Number(
      (
        await one<{ count: string }>(
          "SELECT count(*) count FROM users WHERE role='platformAdmin' AND status='active'",
        )
      )?.count ?? 0,
    ) <= 1
  )
    return "last_admin";
  await transaction(async (c) => {
    await c.query("UPDATE reports SET owner_id=$1 WHERE owner_id=$2", [replacementOwnerId, userId]);
    await c.query("UPDATE documents SET owner_id=$1 WHERE owner_id=$2", [
      replacementOwnerId,
      userId,
    ]);
    await c.query("DELETE FROM report_permissions WHERE user_id=$1", [userId]);
    await c.query("UPDATE report_permissions SET granted_by=$1 WHERE granted_by=$2", [
      replacementOwnerId,
      userId,
    ]);
    await c.query("DELETE FROM report_grants WHERE target_kind='user' AND target_value=$1", [
      userId,
    ]);
    await c.query("UPDATE report_grants SET granted_by=$1 WHERE granted_by=$2", [
      replacementOwnerId,
      userId,
    ]);
    await c.query("DELETE FROM audit_logs WHERE user_id=$1", [userId]);
    await c.query("DELETE FROM login_attempts WHERE email=(SELECT email FROM users WHERE id=$1)", [
      userId,
    ]);
    await c.query("DELETE FROM users WHERE id=$1", [userId]);
  });
  return "deleted";
}
export async function listShareTargets(): Promise<AuthUser[]> {
  return (
    await rows<Omit<UserRow, "password_hash">>(
      "SELECT id,email,name,role,organization_type,organization_name FROM users WHERE status='active' ORDER BY name",
    )
  ).map(rowUser);
}
export interface OrganizationTarget {
  key: string;
  type: OrganizationType;
  name: string;
}
export async function listOrganizationTargets(): Promise<OrganizationTarget[]> {
  const data = await rows<{ organization_type: OrganizationType; organization_name: string }>(
    "SELECT DISTINCT organization_type,organization_name FROM users WHERE status='active' AND organization_type IS NOT NULL AND organization_name IS NOT NULL ORDER BY organization_name",
  );
  return data.map((r) => ({
    key: `${r.organization_type}::${r.organization_name}`,
    type: r.organization_type,
    name: r.organization_name,
  }));
}
export async function listAuditLogs(
  limit = 30,
): Promise<
  Array<{
    id: string;
    userId: string | null;
    action: string;
    resourceType: string | null;
    createdAt: number;
  }>
> {
  const data = await rows<{
    id: string;
    user_id: string | null;
    action: string;
    resource_type: string | null;
    created_at: string;
  }>(
    "SELECT id,user_id,action,resource_type,created_at FROM audit_logs ORDER BY created_at DESC LIMIT $1",
    [limit],
  );
  return data.map((r) => ({
    id: r.id,
    userId: r.user_id,
    action: r.action,
    resourceType: r.resource_type,
    createdAt: Number(r.created_at),
  }));
}

export interface ReportGrant {
  id: string;
  targetKind: "user" | "organization";
  targetValue: string;
  expiresAt: number | null;
  canDownload: boolean;
}
export interface StoredReport {
  id: string;
  ownerId: string;
  result: AnalyzeResult;
  savedAt: string;
  visibility: ReportVisibility;
  grants: ReportGrant[];
  canManage: boolean;
  canDownload: boolean;
}
export async function saveReport(ownerId: string, result: AnalyzeResult): Promise<string> {
  const id = randomUUID(),
    now = Date.now();
  const saved = await one<{ id: string }>(
    `INSERT INTO reports(id,owner_id,region_id,region_name,vintage,risk_score,quality_band,result_json,generated_at,created_at,updated_at,visibility)VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,'private')ON CONFLICT(owner_id,generated_at)DO UPDATE SET result_json=excluded.result_json,risk_score=excluded.risk_score,quality_band=excluded.quality_band,updated_at=excluded.updated_at RETURNING id`,
    [
      id,
      ownerId,
      result.region.id,
      result.region.name,
      result.timeframe.start.slice(0, 4),
      result.riskScore,
      result.qualityBand ?? result.riskBand,
      result,
      result.generatedAt,
      now,
    ],
  );
  return saved?.id ?? id;
}
export async function listReports(user: AuthUser): Promise<StoredReport[]> {
  const org =
    user.organizationType && user.organizationName
      ? `${user.organizationType}::${user.organizationName}`
      : "";
  const data = hasPermission(user, "report:read:any")
    ? await rows<{
        id: string;
        owner_id: string;
        result_json: AnalyzeResult;
        created_at: string;
        visibility: ReportVisibility;
      }>(
        "SELECT id,owner_id,result_json,created_at,visibility FROM reports ORDER BY created_at DESC LIMIT 100",
      )
    : await rows<{
        id: string;
        owner_id: string;
        result_json: AnalyzeResult;
        created_at: string;
        visibility: ReportVisibility;
      }>(
        `SELECT DISTINCT r.id,r.owner_id,r.result_json,r.created_at,r.visibility FROM reports r LEFT JOIN report_grants g ON g.report_id=r.id AND(g.expires_at IS NULL OR g.expires_at>$1)WHERE r.owner_id=$2 OR r.visibility='workspace' OR(r.visibility='restricted' AND((g.target_kind='user' AND g.target_value=$2::text)OR(g.target_kind='organization' AND g.target_value=$3)))ORDER BY r.created_at DESC LIMIT 20`,
        [Date.now(), user.id, org],
      );
  return Promise.all(
    data.map(async (r) => {
      const grants = (
        await rows<{
          id: string;
          target_kind: "user" | "organization";
          target_value: string;
          expires_at: string | null;
          can_download: boolean;
        }>(
          "SELECT id,target_kind,target_value,expires_at,can_download FROM report_grants WHERE report_id=$1 ORDER BY created_at DESC",
          [r.id],
        )
      ).map((g) => ({
        id: g.id,
        targetKind: g.target_kind,
        targetValue: g.target_value,
        expiresAt: g.expires_at === null ? null : Number(g.expires_at),
        canDownload: g.can_download,
      }));
      const matching = grants.find(
        (g) =>
          (!g.expiresAt || g.expiresAt > Date.now()) &&
          ((g.targetKind === "user" && g.targetValue === user.id) ||
            (g.targetKind === "organization" && g.targetValue === org)),
      );
      return {
        id: r.id,
        ownerId: r.owner_id,
        result: r.result_json,
        savedAt: new Date(Number(r.created_at)).toISOString(),
        visibility: r.visibility,
        grants,
        canManage: canManageReport(user, r.owner_id),
        canDownload: canManageReport(user, r.owner_id) || Boolean(matching?.canDownload),
      };
    }),
  );
}
export async function deleteReport(user: AuthUser, id: string): Promise<boolean> {
  const report = await one<{ owner_id: string }>("SELECT owner_id FROM reports WHERE id=$1", [id]);
  if (!report || !canManageReport(user, report.owner_id)) return false;
  return (await run("DELETE FROM reports WHERE id=$1", [id])) > 0;
}
export async function setReportShare(
  actor: AuthUser,
  reportId: string,
  targetUserId: string,
  shared: boolean,
): Promise<boolean> {
  const report = await one<{ owner_id: string }>("SELECT owner_id FROM reports WHERE id=$1", [
    reportId,
  ]);
  if (
    !report ||
    !canManageReport(actor, report.owner_id) ||
    !(await one("SELECT id FROM users WHERE id=$1 AND status='active'", [targetUserId]))
  )
    return false;
  if (shared)
    await run(
      "INSERT INTO report_permissions(report_id,user_id,permission,granted_by,created_at)VALUES($1,$2,'view',$3,$4)ON CONFLICT(report_id,user_id)DO UPDATE SET granted_by=excluded.granted_by,created_at=excluded.created_at",
      [reportId, targetUserId, actor.id, Date.now()],
    );
  else
    await run("DELETE FROM report_permissions WHERE report_id=$1 AND user_id=$2", [
      reportId,
      targetUserId,
    ]);
  return true;
}
export async function setReportVisibility(
  actor: AuthUser,
  reportId: string,
  visibility: ReportVisibility,
): Promise<boolean> {
  const report = await one<{ owner_id: string }>("SELECT owner_id FROM reports WHERE id=$1", [
    reportId,
  ]);
  if (!report || !canManageReport(actor, report.owner_id)) return false;
  const changed = await run("UPDATE reports SET visibility=$1,updated_at=$2 WHERE id=$3", [
    visibility,
    Date.now(),
    reportId,
  ]);
  if (changed && visibility !== "restricted")
    await run("DELETE FROM report_grants WHERE report_id=$1", [reportId]);
  return changed > 0;
}
export async function setReportGrant(
  actor: AuthUser,
  reportId: string,
  input: {
    targetKind: "user" | "organization";
    targetValue: string;
    expiresAt: number | null;
    canDownload: boolean;
    shared: boolean;
  },
): Promise<boolean> {
  const report = await one<{ owner_id: string; visibility: ReportVisibility }>(
    "SELECT owner_id,visibility FROM reports WHERE id=$1",
    [reportId],
  );
  if (!report || !canManageReport(actor, report.owner_id) || report.visibility !== "restricted")
    return false;
  if (
    input.targetKind === "user" &&
    !(await one("SELECT id FROM users WHERE id=$1 AND status='active'", [input.targetValue]))
  )
    return false;
  if (input.targetKind === "organization") {
    const [type, name] = input.targetValue.split("::");
    if (
      !type ||
      !name ||
      !(await one(
        "SELECT id FROM users WHERE status='active' AND organization_type=$1 AND organization_name=$2 LIMIT 1",
        [type, name],
      ))
    )
      return false;
  }
  if (input.shared)
    await run(
      "INSERT INTO report_grants(id,report_id,target_kind,target_value,expires_at,can_download,granted_by,created_at)VALUES($1,$2,$3,$4,$5,$6,$7,$8)ON CONFLICT(report_id,target_kind,target_value)DO UPDATE SET expires_at=excluded.expires_at,can_download=excluded.can_download,granted_by=excluded.granted_by,created_at=excluded.created_at",
      [
        randomUUID(),
        reportId,
        input.targetKind,
        input.targetValue,
        input.expiresAt,
        input.canDownload,
        actor.id,
        Date.now(),
      ],
    );
  else
    await run(
      "DELETE FROM report_grants WHERE report_id=$1 AND target_kind=$2 AND target_value=$3",
      [reportId, input.targetKind, input.targetValue],
    );
  return true;
}
export async function canDownloadReport(user: AuthUser, reportId: string): Promise<boolean> {
  return (await listReports(user)).some((r) => r.id === reportId && r.canDownload);
}
export interface StoredDocument extends UploadMeta {
  id: string;
  ownerId: string;
  createdAt: number;
}
export async function saveDocument(
  ownerId: string,
  document: UploadMeta,
  contentHash: string,
): Promise<StoredDocument> {
  const id = randomUUID(),
    now = Date.now();
  const saved = await one<{ id: string }>(
    "INSERT INTO documents(id,owner_id,filename,size,mime,content,content_hash,created_at)VALUES($1,$2,$3,$4,$5,$6,$7,$8)ON CONFLICT(owner_id,content_hash)DO UPDATE SET filename=excluded.filename,mime=excluded.mime RETURNING id",
    [
      id,
      ownerId,
      document.name,
      document.size,
      document.mime,
      document.content ?? "",
      contentHash,
      now,
    ],
  );
  return {
    id: saved?.id ?? id,
    ownerId,
    name: document.name,
    size: document.size,
    mime: document.mime,
    content: document.content,
    createdAt: now,
  };
}
export async function listDocuments(user: AuthUser): Promise<StoredDocument[]> {
  const data = hasPermission(user, "document:read:any")
    ? await rows<{
        id: string;
        owner_id: string;
        filename: string;
        size: string;
        mime: string;
        content: string;
        created_at: string;
      }>("SELECT * FROM documents ORDER BY created_at DESC LIMIT 100")
    : await rows<{
        id: string;
        owner_id: string;
        filename: string;
        size: string;
        mime: string;
        content: string;
        created_at: string;
      }>("SELECT * FROM documents WHERE owner_id=$1 ORDER BY created_at DESC LIMIT 50", [user.id]);
  return data.map((r) => ({
    id: r.id,
    ownerId: r.owner_id,
    name: r.filename,
    size: Number(r.size),
    mime: r.mime,
    content: r.content,
    createdAt: Number(r.created_at),
  }));
}
export async function deleteDocument(user: AuthUser, id: string): Promise<boolean> {
  const any = hasPermission(user, "document:read:any");
  return (
    (await run(
      any
        ? "DELETE FROM documents WHERE id=$1"
        : "DELETE FROM documents WHERE id=$1 AND owner_id=$2",
      any ? [id] : [id, user.id],
    )) > 0
  );
}
export async function writeAuditLog(
  userId: string | null,
  action: string,
  resourceType?: string,
  resourceId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await run(
    "INSERT INTO audit_logs(id,user_id,action,resource_type,resource_id,metadata,created_at)VALUES($1,$2,$3,$4,$5,$6,$7)",
    [
      randomUUID(),
      userId,
      action,
      resourceType ?? null,
      resourceId ?? null,
      metadata ?? null,
      Date.now(),
    ],
  );
}
