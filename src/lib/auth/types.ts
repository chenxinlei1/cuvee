export type Role = "platformAdmin" | "wineryAdmin" | "wineryStaff" | "buyerAdmin" | "buyerStaff";
export type OrganizationType = "chateau" | "negociant" | "distributor" | "buyer";
export type ReportVisibility = "private" | "restricted" | "workspace";
export type Permission =
  | "analysis:run"
  | "workspace:vineyard"
  | "workspace:trade"
  | "report:read"
  | "report:read:any"
  | "report:manage"
  | "document:manage"
  | "document:read:any"
  | "user:manage"
  | "user:manage:organization"
  | "role:manage";
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  permissions: Permission[];
  organizationId?: string;
  organizationType?: OrganizationType;
  organizationName?: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  platformAdmin: "平台超级管理员",
  wineryAdmin: "酒庄管理员",
  wineryStaff: "酒庄操作员",
  buyerAdmin: "商超 / 酒商管理员",
  buyerStaff: "采购员",
};

export function hasPermission(user: AuthUser, permission: Permission): boolean {
  // Sessions created before the database-driven RBAC migration may briefly
  // expose the legacy user shape during a hot reload. Fail closed instead of
  // crashing the entire navigation; /api/auth/me will refresh the full set.
  return Array.isArray(user.permissions) && user.permissions.includes(permission);
}

export function canAccessVineyard(user: AuthUser): boolean {
  return (
    hasPermission(user, "analysis:run") && hasPermission(user, "workspace:vineyard")
  );
}

export function canAccessTrade(user: AuthUser): boolean {
  return (
    hasPermission(user, "analysis:run") && hasPermission(user, "workspace:trade")
  );
}

export function canManageReport(user: AuthUser, ownerId: string, organizationId?: string): boolean {
  return (
    hasPermission(user, "report:manage") &&
    (hasPermission(user, "report:read:any") || user.id === ownerId || (Boolean(user.organizationId) && user.organizationId === organizationId))
  );
}

export function defaultAppPath(user: AuthUser): string {
  if (hasPermission(user, "user:manage")) return "/admin";
  if (!hasPermission(user, "analysis:run")) return "/reports";
  if (canAccessVineyard(user)) return "/vineyard";
  if (canAccessTrade(user)) return "/trade";
  return "/reports";
}
