export type Role = "admin" | "analyst" | "viewer";
export type OrganizationType = "chateau" | "negociant" | "distributor" | "buyer";
export type ReportVisibility = "internal" | "partner" | "public";
export type Permission = "analysis:run" | "report:read" | "report:read:any" | "document:manage" | "agent:manage" | "user:manage";
export interface AuthUser { id: string; email: string; name: string; role: Role; organizationType?: OrganizationType; organizationName?: string }

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: ["analysis:run", "report:read", "report:read:any", "document:manage", "agent:manage", "user:manage"],
  analyst: ["analysis:run", "report:read", "document:manage"],
  viewer: ["report:read"],
};
export function hasPermission(user: AuthUser, permission: Permission): boolean {
  return ROLE_PERMISSIONS[user.role].includes(permission);
}
