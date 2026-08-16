export type Role = "admin" | "analyst" | "viewer";
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
  admin: [
    "analysis:run",
    "report:read",
    "report:read:any",
    "report:manage",
    "document:manage",
    "document:read:any",
    "user:manage",
  ],
  analyst: ["analysis:run", "report:read", "report:manage", "document:manage"],
  viewer: ["report:read"],
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
