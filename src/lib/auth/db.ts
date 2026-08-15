import "server-only";
import { mkdirSync } from "node:fs";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { join } from "node:path";
import type { AuthUser, OrganizationType, ReportVisibility, Role } from "./types";
import type { AnalyzeResult, UploadMeta } from "@/lib/wine/types";

let database: import("node:sqlite").DatabaseSync | null | undefined;
function passwordHash(password: string, salt = randomBytes(16).toString("hex")): string {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
function verifyPassword(password: string, stored: string): boolean {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
async function getDatabase(): Promise<import("node:sqlite").DatabaseSync | null> {
  if (database !== undefined) return database;
  try {
    const { DatabaseSync } = await import("node:sqlite");
    const dir = join(process.cwd(), "data", ".memory");
    mkdirSync(dir, { recursive: true });
    database = new DatabaseSync(join(dir, "auth.sqlite"));
    database.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
        password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','analyst','viewer')),
        status TEXT NOT NULL DEFAULT 'active', created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY, user_id TEXT, action TEXT NOT NULL, resource_type TEXT,
        resource_id TEXT, metadata TEXT, created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_audit_user_time ON audit_logs(user_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, region_id TEXT NOT NULL,
        region_name TEXT NOT NULL, vintage TEXT NOT NULL, risk_score INTEGER NOT NULL,
        quality_band TEXT, result_json TEXT NOT NULL, generated_at TEXT NOT NULL,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
        UNIQUE(owner_id, generated_at)
      );
      CREATE INDEX IF NOT EXISTS idx_reports_owner_time ON reports(owner_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, filename TEXT NOT NULL,
        size INTEGER NOT NULL, mime TEXT NOT NULL, content TEXT NOT NULL,
        content_hash TEXT NOT NULL, created_at INTEGER NOT NULL,
        UNIQUE(owner_id, content_hash)
      );
      CREATE INDEX IF NOT EXISTS idx_documents_owner_time ON documents(owner_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS report_permissions (
        report_id TEXT NOT NULL, user_id TEXT NOT NULL, permission TEXT NOT NULL DEFAULT 'view',
        granted_by TEXT NOT NULL, created_at INTEGER NOT NULL,
        PRIMARY KEY(report_id,user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_report_permissions_user ON report_permissions(user_id);
      CREATE TABLE IF NOT EXISTS report_grants (
        id TEXT PRIMARY KEY, report_id TEXT NOT NULL, target_kind TEXT NOT NULL,
        target_value TEXT NOT NULL, expires_at INTEGER, can_download INTEGER NOT NULL DEFAULT 0,
        granted_by TEXT NOT NULL, created_at INTEGER NOT NULL,
        UNIQUE(report_id,target_kind,target_value)
      );
      CREATE INDEX IF NOT EXISTS idx_report_grants_report ON report_grants(report_id);
    `);
    const userColumns=database.prepare("PRAGMA table_info(users)").all() as unknown as Array<{name:string}>;
    if(!userColumns.some((column)=>column.name==="organization_type"))database.exec("ALTER TABLE users ADD COLUMN organization_type TEXT");
    if(!userColumns.some((column)=>column.name==="organization_name"))database.exec("ALTER TABLE users ADD COLUMN organization_name TEXT");
    const reportColumns=database.prepare("PRAGMA table_info(reports)").all() as unknown as Array<{name:string}>;
    if(!reportColumns.some((column)=>column.name==="visibility"))database.exec("ALTER TABLE reports ADD COLUMN visibility TEXT NOT NULL DEFAULT 'internal'");
    database.exec(`INSERT OR IGNORE INTO report_grants(id,report_id,target_kind,target_value,expires_at,can_download,granted_by,created_at)
      SELECT lower(hex(randomblob(16))),report_id,'user',user_id,NULL,0,granted_by,created_at FROM report_permissions`);
    seedDemoUsers(database);
    return database;
  } catch (error) { console.error("[auth-db]", error); database = null; return null; }
}
function seedDemoUsers(db: import("node:sqlite").DatabaseSync): void {
  const users: Array<[string, string, Role, string]> = [
    ["admin@cuvee.demo", "Cuvée Admin", "admin", "cuvee-admin-2024"],
    ["analyst@cuvee.demo", "Vintage Analyst", "analyst", "cuvee-demo-2024"],
    ["viewer@cuvee.demo", "Report Viewer", "viewer", "cuvee-view-2024"],
  ];
  const insert = db.prepare(`INSERT OR IGNORE INTO users
    (id,email,name,password_hash,role,status,created_at) VALUES (?,?,?,?,?,'active',?)`);
  for (const [email, name, role, password] of users) insert.run(randomUUID(), email, name, passwordHash(password), role, Date.now());
  db.prepare("UPDATE users SET organization_type='chateau',organization_name='Cuvée Platform' WHERE email='admin@cuvee.demo' AND organization_type IS NULL").run();
  db.prepare("UPDATE users SET organization_type='chateau',organization_name='Demo Château' WHERE email='analyst@cuvee.demo' AND organization_type IS NULL").run();
  db.prepare("UPDATE users SET organization_type='buyer',organization_name='Demo Buyer Group' WHERE email='viewer@cuvee.demo' AND organization_type IS NULL").run();
}
interface UserRow { id: string; email: string; name: string; password_hash: string; role: Role; organization_type:string|null;organization_name:string|null }
function rowUser(row:Omit<UserRow,"password_hash">):AuthUser{return{id:row.id,email:row.email,name:row.name,role:row.role,organizationType:(row.organization_type??undefined) as OrganizationType|undefined,organizationName:row.organization_name??undefined};}
export async function authenticate(email: string, password: string): Promise<AuthUser | null> {
  const db = await getDatabase(); if (!db) return null;
  const row = db.prepare("SELECT id,email,name,password_hash,role,organization_type,organization_name FROM users WHERE lower(email)=lower(?) AND status='active'").get(email) as UserRow | undefined;
  return row && verifyPassword(password, row.password_hash) ? rowUser(row) : null;
}
export async function userStatusByEmail(email:string):Promise<string|null>{const db=await getDatabase();if(!db)return null;const row=db.prepare("SELECT status FROM users WHERE lower(email)=lower(?)").get(email) as {status:string}|undefined;return row?.status??null;}
export async function findUserById(id: string): Promise<AuthUser | null> {
  const db = await getDatabase(); if (!db) return null;
  const row = db.prepare("SELECT id,email,name,role,organization_type,organization_name FROM users WHERE id=? AND status='active'").get(id) as Omit<UserRow,"password_hash"> | undefined;
  return row ? rowUser(row) : null;
}
export async function listUsers(): Promise<Array<AuthUser & { status: string; createdAt: number }>> {
  const db = await getDatabase(); if (!db) return [];
  const rows = db.prepare("SELECT id,email,name,role,status,organization_type AS organizationType,organization_name AS organizationName,created_at FROM users ORDER BY created_at ASC").all() as unknown as Array<AuthUser & { status: string; created_at: number }>;
  return rows.map(({ created_at, ...row }) => ({ ...row, createdAt: created_at }));
}
export async function createUser(input:{email:string;name:string;password:string;role?:Role;status?:"pending"|"active"|"disabled";organizationType?:OrganizationType;organizationName?:string}):Promise<AuthUser & {status:string;createdAt:number}>{
  const db=await getDatabase();if(!db)throw new Error("Database unavailable");
  const id=randomUUID();const createdAt=Date.now();const role=input.role??"viewer";const status=input.status??"pending";
  try{db.prepare("INSERT INTO users(id,email,name,password_hash,role,status,organization_type,organization_name,created_at) VALUES(?,?,?,?,?,?,?,?,?)").run(id,input.email.trim().toLowerCase(),input.name.trim(),passwordHash(input.password),role,status,input.organizationType??null,input.organizationName?.trim()||null,createdAt);}
  catch(error){if(String(error).includes("UNIQUE"))throw new Error("EMAIL_EXISTS");throw error;}
  return{id,email:input.email.trim().toLowerCase(),name:input.name.trim(),role,status,organizationType:input.organizationType,organizationName:input.organizationName?.trim()||undefined,createdAt};
}
export async function updateUser(id:string,patch:{role?:Role;status?:"pending"|"active"|"disabled";organizationType?:OrganizationType;organizationName?:string}):Promise<boolean>{
  const db=await getDatabase();if(!db)return false;
  const current=db.prepare("SELECT role,status,organization_type,organization_name FROM users WHERE id=?").get(id) as {role:Role;status:string;organization_type:string|null;organization_name:string|null}|undefined;if(!current)return false;
  const result=db.prepare("UPDATE users SET role=?,status=?,organization_type=?,organization_name=? WHERE id=?").run(patch.role??current.role,patch.status??current.status,patch.organizationType??current.organization_type,patch.organizationName??current.organization_name,id);return result.changes>0;
}
export async function listShareTargets(): Promise<AuthUser[]> {
  const db=await getDatabase(); if(!db)return [];
  const rows=db.prepare("SELECT id,email,name,role,organization_type,organization_name FROM users WHERE status='active' AND role='viewer' ORDER BY name").all() as unknown as Array<Omit<UserRow,"password_hash">>;
  return rows.map(rowUser);
}
export interface OrganizationTarget{key:string;type:OrganizationType;name:string}
export async function listOrganizationTargets():Promise<OrganizationTarget[]>{const db=await getDatabase();if(!db)return[];const rows=db.prepare("SELECT DISTINCT organization_type,organization_name FROM users WHERE status='active' AND organization_type IS NOT NULL AND organization_name IS NOT NULL ORDER BY organization_name").all() as unknown as Array<{organization_type:OrganizationType;organization_name:string}>;return rows.map(row=>({key:`${row.organization_type}::${row.organization_name}`,type:row.organization_type,name:row.organization_name}));}
export async function listAuditLogs(limit = 30): Promise<Array<{ id: string; userId: string | null; action: string; resourceType: string | null; createdAt: number }>> {
  const db = await getDatabase(); if (!db) return [];
  const rows = db.prepare("SELECT id,user_id,action,resource_type,created_at FROM audit_logs ORDER BY created_at DESC LIMIT ?").all(limit) as unknown as Array<{ id: string; user_id: string | null; action: string; resource_type: string | null; created_at: number }>;
  return rows.map((row) => ({ id: row.id, userId: row.user_id, action: row.action, resourceType: row.resource_type, createdAt: row.created_at }));
}

export interface ReportGrant {id:string;targetKind:"user"|"organization";targetValue:string;expiresAt:number|null;canDownload:boolean}
export interface StoredReport { id: string; ownerId: string; result: AnalyzeResult; savedAt: string; visibility:ReportVisibility; grants:ReportGrant[]; canManage: boolean; canDownload:boolean }
export async function saveReport(ownerId: string, result: AnalyzeResult): Promise<string> {
  const db = await getDatabase(); if (!db) throw new Error("Database unavailable");
  const existing = db.prepare("SELECT id FROM reports WHERE owner_id=? AND generated_at=?").get(ownerId, result.generatedAt) as { id: string } | undefined;
  const id = existing?.id ?? randomUUID(); const now = Date.now();
  db.prepare(`INSERT INTO reports (id,owner_id,region_id,region_name,vintage,risk_score,quality_band,result_json,generated_at,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(owner_id,generated_at) DO UPDATE SET result_json=excluded.result_json,risk_score=excluded.risk_score,quality_band=excluded.quality_band,updated_at=excluded.updated_at`)
    .run(id, ownerId, result.region.id, result.region.name, result.timeframe.start.slice(0,4), result.riskScore, result.qualityBand ?? result.riskBand, JSON.stringify(result), result.generatedAt, now, now);
  return id;
}
export async function listReports(user: AuthUser): Promise<StoredReport[]> {
  const db = await getDatabase(); if (!db) return [];
  const rows = (user.role === "admin"
    ? db.prepare("SELECT id,owner_id,result_json,created_at,visibility FROM reports ORDER BY created_at DESC LIMIT 100").all()
    : db.prepare(`SELECT DISTINCT r.id,r.owner_id,r.result_json,r.created_at,r.visibility FROM reports r
        LEFT JOIN report_grants g ON g.report_id=r.id AND (g.expires_at IS NULL OR g.expires_at>?)
        WHERE r.owner_id=? OR r.visibility='public' OR
          (r.visibility='partner' AND ((g.target_kind='user' AND g.target_value=?) OR (g.target_kind='organization' AND g.target_value=?)))
        ORDER BY r.created_at DESC LIMIT 20`).all(Date.now(),user.id,user.id,user.organizationType&&user.organizationName?`${user.organizationType}::${user.organizationName}`:"")) as unknown as Array<{ id:string; owner_id:string; result_json:string; created_at:number;visibility:ReportVisibility }>;
  return rows.flatMap((row) => { try {
    const grants=(db.prepare("SELECT id,target_kind,target_value,expires_at,can_download FROM report_grants WHERE report_id=? ORDER BY created_at DESC").all(row.id) as unknown as Array<{id:string;target_kind:"user"|"organization";target_value:string;expires_at:number|null;can_download:number}>).map((grant)=>({id:grant.id,targetKind:grant.target_kind,targetValue:grant.target_value,expiresAt:grant.expires_at,canDownload:Boolean(grant.can_download)}));
    const organizationKey=user.organizationType&&user.organizationName?`${user.organizationType}::${user.organizationName}`:"";
    const matching=grants.find((grant)=>(!grant.expiresAt||grant.expiresAt>Date.now())&&((grant.targetKind==="user"&&grant.targetValue===user.id)||(grant.targetKind==="organization"&&grant.targetValue===organizationKey)));
    return [{ id: row.id, ownerId: row.owner_id, result: JSON.parse(row.result_json) as AnalyzeResult, savedAt: new Date(row.created_at).toISOString(), visibility:row.visibility, grants, canManage:user.role==="admin"||row.owner_id===user.id, canDownload:user.role==="admin"||row.owner_id===user.id||Boolean(matching?.canDownload) }];
  } catch { return []; } });
}
export async function deleteReport(user: AuthUser, id: string): Promise<boolean> {
  const db = await getDatabase(); if (!db) return false;
  const allowed=user.role==="admin"?db.prepare("SELECT id FROM reports WHERE id=?").get(id):db.prepare("SELECT id FROM reports WHERE id=? AND owner_id=?").get(id,user.id);
  if(!allowed)return false;
  db.prepare("DELETE FROM report_permissions WHERE report_id=?").run(id);
  db.prepare("DELETE FROM report_grants WHERE report_id=?").run(id);
  const result = db.prepare("DELETE FROM reports WHERE id=?").run(id);
  return result.changes > 0;
}
export async function setReportShare(actor:AuthUser,reportId:string,targetUserId:string,shared:boolean):Promise<boolean>{
  const db=await getDatabase();if(!db)return false;
  const report=db.prepare("SELECT owner_id FROM reports WHERE id=?").get(reportId) as {owner_id:string}|undefined;
  if(!report||(actor.role!=="admin"&&report.owner_id!==actor.id))return false;
  const target=db.prepare("SELECT id FROM users WHERE id=? AND role='viewer' AND status='active'").get(targetUserId);
  if(!target)return false;
  if(shared)db.prepare("INSERT INTO report_permissions(report_id,user_id,permission,granted_by,created_at) VALUES(?,?,'view',?,?) ON CONFLICT(report_id,user_id) DO UPDATE SET granted_by=excluded.granted_by,created_at=excluded.created_at").run(reportId,targetUserId,actor.id,Date.now());
  else db.prepare("DELETE FROM report_permissions WHERE report_id=? AND user_id=?").run(reportId,targetUserId);
  return true;
}
export async function setReportVisibility(actor:AuthUser,reportId:string,visibility:ReportVisibility):Promise<boolean>{const db=await getDatabase();if(!db)return false;const result=actor.role==="admin"?db.prepare("UPDATE reports SET visibility=?,updated_at=? WHERE id=?").run(visibility,Date.now(),reportId):db.prepare("UPDATE reports SET visibility=?,updated_at=? WHERE id=? AND owner_id=?").run(visibility,Date.now(),reportId,actor.id);if(result.changes>0&&visibility==="internal")db.prepare("DELETE FROM report_grants WHERE report_id=?").run(reportId);return result.changes>0;}
export async function setReportGrant(actor:AuthUser,reportId:string,input:{targetKind:"user"|"organization";targetValue:string;expiresAt:number|null;canDownload:boolean;shared:boolean}):Promise<boolean>{
  const db=await getDatabase();if(!db)return false;const report=db.prepare("SELECT owner_id,visibility FROM reports WHERE id=?").get(reportId) as {owner_id:string;visibility:ReportVisibility}|undefined;if(!report||(actor.role!=="admin"&&report.owner_id!==actor.id)||report.visibility==="internal")return false;
  if(input.targetKind==="user"&&!db.prepare("SELECT id FROM users WHERE id=? AND role='viewer' AND status='active'").get(input.targetValue))return false;
  if(input.targetKind==="organization"){const [type,name]=input.targetValue.split("::");if(!type||!name||!db.prepare("SELECT id FROM users WHERE status='active' AND organization_type=? AND organization_name=? LIMIT 1").get(type,name))return false;}
  if(input.shared)db.prepare(`INSERT INTO report_grants(id,report_id,target_kind,target_value,expires_at,can_download,granted_by,created_at) VALUES(?,?,?,?,?,?,?,?)
    ON CONFLICT(report_id,target_kind,target_value) DO UPDATE SET expires_at=excluded.expires_at,can_download=excluded.can_download,granted_by=excluded.granted_by,created_at=excluded.created_at`).run(randomUUID(),reportId,input.targetKind,input.targetValue,input.expiresAt,input.canDownload?1:0,actor.id,Date.now());
  else db.prepare("DELETE FROM report_grants WHERE report_id=? AND target_kind=? AND target_value=?").run(reportId,input.targetKind,input.targetValue);
  return true;
}
export async function canDownloadReport(user:AuthUser,reportId:string):Promise<boolean>{const reports=await listReports(user);return reports.some((report)=>report.id===reportId&&report.canDownload);}

export interface StoredDocument extends UploadMeta { id: string; ownerId: string; createdAt: number }
export async function saveDocument(ownerId: string, document: UploadMeta, contentHash: string): Promise<StoredDocument> {
  const db = await getDatabase(); if (!db) throw new Error("Database unavailable");
  const existing = db.prepare("SELECT id FROM documents WHERE owner_id=? AND content_hash=?").get(ownerId, contentHash) as {id:string}|undefined;
  const id = existing?.id ?? randomUUID(); const now = Date.now();
  db.prepare(`INSERT INTO documents (id,owner_id,filename,size,mime,content,content_hash,created_at) VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(owner_id,content_hash) DO UPDATE SET filename=excluded.filename,mime=excluded.mime`)
    .run(id,ownerId,document.name,document.size,document.mime,document.content ?? "",contentHash,now);
  return { id, ownerId, name: document.name, size: document.size, mime: document.mime, content: document.content, createdAt: now };
}
export async function listDocuments(user: AuthUser): Promise<StoredDocument[]> {
  const db = await getDatabase(); if (!db) return [];
  const rows = (user.role === "admin" ? db.prepare("SELECT * FROM documents ORDER BY created_at DESC LIMIT 100").all() : db.prepare("SELECT * FROM documents WHERE owner_id=? ORDER BY created_at DESC LIMIT 50").all(user.id)) as unknown as Array<{id:string;owner_id:string;filename:string;size:number;mime:string;content:string;created_at:number}>;
  return rows.map((row) => ({ id:row.id, ownerId:row.owner_id, name:row.filename, size:row.size, mime:row.mime, content:row.content, createdAt:row.created_at }));
}
export async function deleteDocument(user: AuthUser,id:string):Promise<boolean>{
  const db=await getDatabase(); if(!db)return false;
  const result=user.role==="admin"?db.prepare("DELETE FROM documents WHERE id=?").run(id):db.prepare("DELETE FROM documents WHERE id=? AND owner_id=?").run(id,user.id);
  return result.changes>0;
}
export async function writeAuditLog(userId: string | null, action: string, resourceType?: string, resourceId?: string, metadata?: Record<string, unknown>): Promise<void> {
  const db = await getDatabase(); if (!db) return;
  db.prepare(`INSERT INTO audit_logs (id,user_id,action,resource_type,resource_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)`)
    .run(randomUUID(), userId, action, resourceType ?? null, resourceId ?? null, metadata ? JSON.stringify(metadata) : null, Date.now());
}
