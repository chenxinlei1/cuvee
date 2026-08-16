import {
  bigint,
  boolean,
  check,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const roleEnum = pgEnum("role", [
  "platformAdmin",
  "wineryAdmin",
  "wineryStaff",
  "buyerAdmin",
  "buyerStaff",
]);
export const userStatusEnum = pgEnum("user_status", ["pending", "active", "disabled"]);
export const organizationTypeEnum = pgEnum("organization_type", [
  "chateau",
  "negociant",
  "distributor",
  "buyer",
]);
export const visibilityEnum = pgEnum("report_visibility", ["private", "restricted", "workspace"]);
export const grantTargetEnum = pgEnum("grant_target_kind", ["user", "organization"]);

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  type: organizationTypeEnum("type").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => [unique().on(table.type, table.name)]);

export const accessRoles = pgTable("access_roles", {
  id: uuid("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  system: boolean("system").notNull().default(false),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});
export const permissions = pgTable("permissions", {
  key: text("key").primaryKey(),
  description: text("description").notNull(),
});
export const rolePermissions = pgTable("role_permissions", {
  roleId: uuid("role_id").notNull().references(() => accessRoles.id, { onDelete: "cascade" }),
  permissionKey: text("permission_key").notNull().references(() => permissions.key, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.roleId, table.permissionKey] })]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  status: userStatusEnum("status").notNull().default("active"),
  organizationType: organizationTypeEnum("organization_type"),
  organizationName: text("organization_name"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  emailVerifiedAt: bigint("email_verified_at", { mode: "number" }),
});
export const organizationMembers = pgTable("organization_members", {
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => [primaryKey({ columns: [table.organizationId, table.userId] }), unique().on(table.userId)]);
export const userRoles = pgTable("user_roles", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: uuid("role_id").notNull().references(() => accessRoles.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.roleId] })]);

export const authTokenTypeEnum = pgEnum("auth_token_type", ["email_verification", "password_reset"]);
export const authTokens = pgTable(
  "auth_tokens",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    type: authTokenTypeEnum("type").notNull(),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
    usedAt: bigint("used_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [index("idx_auth_tokens_user_type").on(table.userId, table.type)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    lastSeenAt: bigint("last_seen_at", { mode: "number" }).notNull(),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
    revokedAt: bigint("revoked_at", { mode: "number" }),
  },
  (table) => [index("idx_sessions_user_active").on(table.userId, table.expiresAt)],
);
export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    organizationId: uuid("organization_id").references(() => organizations.id),
    regionId: text("region_id").notNull(),
    regionName: text("region_name").notNull(),
    vintage: text("vintage").notNull(),
    riskScore: bigint("risk_score", { mode: "number" }).notNull(),
    qualityBand: text("quality_band"),
    resultJson: jsonb("result_json").notNull(),
    generatedAt: text("generated_at").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
    visibility: visibilityEnum("visibility").notNull().default("private"),
  },
  (table) => [
    unique().on(table.ownerId, table.generatedAt),
    index("idx_reports_owner_time").on(table.ownerId, table.createdAt),
  ],
);
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    organizationId: uuid("organization_id").references(() => organizations.id),
    filename: text("filename").notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    mime: text("mime").notNull(),
    content: text("content").notNull(),
    contentHash: text("content_hash").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    unique().on(table.ownerId, table.contentHash),
    index("idx_documents_owner_time").on(table.ownerId, table.createdAt),
  ],
);
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    metadata: jsonb("metadata"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [index("idx_audit_user_time").on(table.userId, table.createdAt)],
);
export const loginAttempts = pgTable(
  "login_attempts",
  {
    email: text("email").notNull(),
    attemptedAt: bigint("attempted_at", { mode: "number" }).notNull(),
  },
  (table) => [index("idx_login_attempts_email_time").on(table.email, table.attemptedAt)],
);
export const reportPermissions = pgTable(
  "report_permissions",
  {
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permission: text("permission").notNull().default("view"),
    grantedBy: uuid("granted_by")
      .notNull()
      .references(() => users.id),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.reportId, table.userId] }),
    index("idx_report_permissions_user").on(table.userId),
  ],
);
export const reportGrants = pgTable(
  "report_grants",
  {
    id: uuid("id").primaryKey(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    targetKind: grantTargetEnum("target_kind").notNull(),
    targetValue: text("target_value").notNull(),
    expiresAt: bigint("expires_at", { mode: "number" }),
    canDownload: boolean("can_download").notNull().default(false),
    grantedBy: uuid("granted_by")
      .notNull()
      .references(() => users.id),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    unique().on(table.reportId, table.targetKind, table.targetValue),
    index("idx_report_grants_report").on(table.reportId),
  ],
);
export const reportAccessLogs = pgTable("report_access_logs", {
  id: uuid("id").primaryKey(),
  reportId: uuid("report_id").notNull().references(() => reports.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => [index("idx_report_access_report_time").on(table.reportId, table.createdAt)]);
export const analysisTasks = pgTable(
  "analysis_tasks",
  {
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    input: jsonb("input").notNull(),
    status: text("status").notNull().default("pending"),
    stage: text("stage"),
    progress: bigint("progress", { mode: "number" }).notNull().default(0),
    result: jsonb("result"),
    error: text("error"),
    heartbeat: bigint("heartbeat", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    startedAt: bigint("started_at", { mode: "number" }),
    finishedAt: bigint("finished_at", { mode: "number" }),
  },
  (table) => [
    check(
      "analysis_tasks_status_check",
      sql`${table.status} IN ('pending','running','completed','failed')`,
    ),
    index("idx_analysis_tasks_claim").on(table.status, table.createdAt),
    index("idx_analysis_tasks_owner_time").on(table.ownerId, table.createdAt),
  ],
);
