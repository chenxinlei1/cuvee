# Role Permission Matrix

This document is the human-readable companion to the database-driven RBAC
model. Source of truth:

- Permission keys / helpers: `src/lib/auth/types.ts`
- Schema: `src/lib/db/schema.ts` (access_roles, permissions, role_permissions)
- Default matrix seed: `drizzle/0002_dynamic_rbac_organizations.sql`
- Enforcement: every API route calls `hasPermission(...)` server-side; data
  queries additionally scope by `organization_id` at the SQL layer.

> **The matrix is not hardcoded.** Roles and their permissions live in
> PostgreSQL and can be edited from the Platform Admin console (`/admin` →
> Role permissions). Changes apply to active sessions on the next request —
> no redeploy, no re-login. Frontend visibility is UX only; authorization is
> always re-checked server-side.

## Roles

| Role key | Display name | Typical owner | Default landing |
|---|---|---|---|
| `platformAdmin` | 平台超级管理员 | Platform / system operator | `/admin` |
| `wineryAdmin` | 酒庄管理员 | A winery organization | `/vineyard` |
| `wineryStaff` | 酒庄操作员 | A winery organization | `/vineyard` |
| `buyerAdmin` | 商超 / 酒商管理员 | A buyer organization | `/trade` |
| `buyerStaff` | 采购员 | A buyer organization | `/trade` |

Landing pages follow `defaultAppPath()` in `src/lib/auth/types.ts`: platform
admins land in the management console, winery roles in the Vineyard
workspace, buyer roles in the Trade workspace, and users without
`analysis:run` on the read-only reports page.

## Permissions

| Permission | Meaning |
|---|---|
| `analysis:run` | Run the analysis pipeline |
| `workspace:vineyard` | Access the Vineyard workspace |
| `workspace:trade` | Access the Trade workspace |
| `report:read` | Read reports the user is authorized to access |
| `report:read:any` | Read any report across organizations (platform scope) |
| `report:manage` | Change report visibility and manage grants |
| `document:manage` | Upload and remove organization documents |
| `document:read:any` | Read any document across organizations (platform scope) |
| `user:manage` | Create/edit users, change roles and account status |
| `user:manage:organization` | Manage users within one's own organization (defined; admin UI is platform-focused today) |
| `role:manage` | Edit the role → permission matrix |

## Default Access Matrix

Seeded by migration `0002`. Platform Admin may change any role from the
console; the matrix below is the out-of-the-box baseline.

| Role key | Permissions |
|---|---|
| `platformAdmin` | All 11 permissions |
| `wineryAdmin` | `analysis:run`, `workspace:vineyard`, `report:read`, `report:manage`, `document:manage`, `user:manage:organization` |
| `wineryStaff` | `analysis:run`, `workspace:vineyard`, `report:read`, `document:manage` |
| `buyerAdmin` | `analysis:run`, `workspace:trade`, `report:read`, `report:manage`, `user:manage:organization` |
| `buyerStaff` | `analysis:run`, `workspace:trade`, `report:read` |

## Data scope (second isolation layer)

Functional permissions answer "what can you do"; organizational scope answers
"what can you see". They are orthogonal:

- Reports, documents, and analysis tasks carry an `organization_id`; queries
  filter on it at the SQL layer, so one organization can never read another's
  rows through list endpoints.
- Cross-organization access to a report is only possible via an explicit
  grant (`report_grants`): target a user or an organization, optionally with
  an expiry and an independent download flag.
- `report:read:any` / `document:read:any` / task inspection are platform-wide
  capabilities reserved for `platformAdmin` by default.
- Workspace access is an explicit permission (`workspace:vineyard` /
  `workspace:trade`), not a client-side role check — a role change is
  immediately reflected in what a session may do.

## Hard protections

- `platformAdmin` cannot lose `role:manage` or `user:manage`
  (`PLATFORM_ADMIN_PROTECTED` in `setAccessRolePermissions`), so the console
  can never lock itself out.
- The last active `platformAdmin` cannot be deleted.
- Administrators cannot change their own role/status or delete their own
  account.
- Self-registration always creates a `pending` `buyerStaff` account; it can
  only sign in after a Platform Admin approves and assigns the final role.

## Audit

Sensitive operations write to `audit_logs`: login success/failure, account
registration/approval, role permission changes, report share/revoke,
visibility changes, downloads, and analysis submissions/completions. Report
access (view/download/share/revoke) is additionally recorded in
`report_access_logs` with IP + user agent.

## Verification

Run the dedicated suites after RBAC or data-query changes:

```bash
pnpm test:rbac        # cross-organization report isolation
pnpm test:report-auth # grants, expiry, revocation, download flag, access logs
pnpm test:tasks       # analysis-task ownership scoping
```

All three run in CI (`pnpm test`) against a disposable PostgreSQL.
