"use client";
import { useState } from "react";
import type { Permission, Role } from "@/lib/auth/types";
import type { AccessRoleDefinition } from "@/lib/auth/db";

export function RoleManager({
  initialRoles,
  permissionDefinitions,
}: {
  initialRoles: AccessRoleDefinition[];
  permissionDefinitions: Array<{ key: Permission; description: string }>;
}) {
  const [roles, setRoles] = useState(initialRoles),
    [saving, setSaving] = useState<Role | null>(null),
    [message, setMessage] = useState<string | null>(null);
  function toggle(role: Role, permission: Permission) {
    setRoles((current) =>
      current.map((item) =>
        item.key === role
          ? {
              ...item,
              permissions: item.permissions.includes(permission)
                ? item.permissions.filter((key) => key !== permission)
                : [...item.permissions, permission],
            }
          : item,
      ),
    );
  }
  async function save(role: AccessRoleDefinition) {
    setSaving(role.key);
    setMessage(null);
    const response = await fetch("/api/admin/roles", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: role.key, permissions: role.permissions }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(null);
    setMessage(response.ok ? `${role.name} 权限已保存` : (data.error ?? "更新失败"));
  }
  return (
    <details className="border-line group mt-8 overflow-hidden border-t">
      <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-5 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="kicker block">角色访问控制</span>
          <span className="mt-1 block text-lg font-semibold">
            角色权限 <span className="text-soft font-normal">· {roles.length}</span>
          </span>
          <span className="text-soft mt-1 block text-xs">修改会立即应用到活跃会话。</span>
        </span>
        <Chevron />
      </summary>
      <div className="divide-line divide-y">
        {roles.map((role) => (
          <article
            key={role.key}
            className="grid gap-4 px-6 py-5 lg:grid-cols-[220px_minmax(0,1fr)]"
          >
            <div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{role.name}</h3>
                  <p className="text-soft text-xs">{role.key}</p>
                </div>
                <button
                  type="button"
                  disabled={saving === role.key}
                  onClick={() => void save(role)}
                  className="rounded-md bg-foreground px-3 py-2 text-xs font-bold text-background disabled:opacity-50"
                >
                  {saving === role.key ? "保存中…" : "保存"}
                </button>
              </div>
            </div>
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {permissionDefinitions.map((permission) => (
                <label key={permission.key} className="flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={role.permissions.includes(permission.key)}
                    onChange={() => toggle(role.key, permission.key)}
                    className="mt-0.5"
                  />
                  <span>
                    <strong className="block">{permission.key}</strong>
                    <span className="text-soft">{permission.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </article>
        ))}
      </div>
      {message ? <p className="border-line border-t px-6 py-3 text-sm">{message}</p> : null}
    </details>
  );
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="text-soft h-4 w-4 shrink-0 fill-none stroke-current transition-transform group-open:rotate-180"
      strokeWidth="1.8"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
