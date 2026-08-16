export type Role = "platformAdmin" | "wineryAdmin" | "wineryStaff" | "buyerAdmin" | "buyerStaff";
export type OrganizationType = "chateau" | "negociant" | "distributor" | "buyer";
export type ReportVisibility = "private" | "restricted" | "workspace";
export type Permission =
  | "analysis:run"
  | "report:read"
  | "report:read:any"
  | "report:manage"
  | "document:manage"
  | "document:read:any"
  | "user:manage";
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationType?: OrganizationType;
  organizationName?: string;
}

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  platformAdmin: [
    "analysis:run",
    "report:read",
    "report:read:any",
    "report:manage",
    "document:manage",
    "document:read:any",
    "user:manage",
  ],
  wineryAdmin: ["analysis:run", "report:read", "report:manage", "document:manage"],
  wineryStaff: ["analysis:run", "report:read", "document:manage"],
  buyerAdmin: ["report:read"],
  buyerStaff: ["report:read"],
};

export const ROLE_LABELS: Record<Role, string> = {
  platformAdmin: "平台超级管理员",
  wineryAdmin: "酒庄管理员",
  wineryStaff: "酒庄操作员",
  buyerAdmin: "商超 / 酒商管理员",
  buyerStaff: "采购员",
};

export function hasPermission(user: AuthUser, permission: Permission): boolean {
  return ROLE_PERMISSIONS[user.role].includes(permission);
}

export function canManageReport(user: AuthUser, ownerId: string): boolean {
  return (
    hasPermission(user, "report:manage") &&
    (hasPermission(user, "report:read:any") || user.id === ownerId)
  );
}

export function defaultAppPath(user: AuthUser): string {
  if (hasPermission(user, "user:manage")) return "/admin";
  if (!hasPermission(user, "analysis:run")) return "/reports";
  if (user.organizationType === "chateau") return "/vineyard";
  return "/trade";
}
