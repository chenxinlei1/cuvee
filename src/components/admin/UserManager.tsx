"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { AuthUser, OrganizationType, Role } from "@/lib/auth/types";
import { ROLE_LABELS } from "@/lib/auth/types";

type ManagedUser = AuthUser & { status: string; createdAt: number };
export type UserFilter = "all" | "active" | "pending" | "platformAdmin";

const USER_FILTERS: Array<{ value: UserFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "active", label: "活跃" },
  { value: "pending", label: "待审核" },
  { value: "platformAdmin", label: "平台管理员" },
];

const ORGS: Array<{ value: OrganizationType; label: string }> = [
  { value: "chateau", label: "酒庄" },
  { value: "negociant", label: "酒商" },
  { value: "distributor", label: "经销商" },
  { value: "buyer", label: "采购方" },
];

export function UserManager({
  initialUsers,
  currentUserId,
  initialFilter = "all",
}: {
  initialUsers: ManagedUser[];
  currentUserId: string;
  initialFilter?: UserFilter;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [filter, setFilter] = useState<UserFilter>(initialFilter);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);

  useEffect(() => setFilter(initialFilter), [initialFilter]);

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        if (filter === "active") return user.status === "active";
        if (filter === "pending") return user.status === "pending";
        if (filter === "platformAdmin") return user.role === "platformAdmin";
        return true;
      }),
    [filter, users],
  );

  const filterCounts = useMemo(
    () => ({
      all: users.length,
      active: users.filter((user) => user.status === "active").length,
      pending: users.filter((user) => user.status === "pending").length,
      platformAdmin: users.filter((user) => user.role === "platformAdmin").length,
    }),
    [users],
  );

  async function refresh() {
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    if (response.ok) {
      setUsers(((await response.json()) as { users: ManagedUser[] }).users);
    }
  }

  async function update(
    id: string,
    patch: {
      role?: Role;
      status?: "pending" | "active" | "disabled";
      organizationType?: OrganizationType;
      organizationName?: string;
      password?: string;
    },
  ) {
    setError(null);
    const response = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "更新失败");
      return;
    }
    await refresh();
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    await update(id, { password });
    setResettingUserId(null);
  }

  async function removeUser(item: ManagedUser) {
    if (
      !window.confirm(
        `Permanently delete ${item.name} (${item.email})? Their reports and documents will be transferred to your account.`,
      )
    )
      return;
    setError(null);
    const response = await fetch(`/api/admin/users/${item.id}`, { method: "DELETE" });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "删除失败");
      return;
    }
    setResettingUserId(null);
    await refresh();
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    setCreating(true);
    setError(null);
    const form = new FormData(element);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        role: form.get("role"),
        organizationType: form.get("organizationType"),
        organizationName: form.get("organizationName"),
      }),
    });
    const data = (await response.json()) as { error?: string };
    setCreating(false);
    if (!response.ok) {
      setError(data.error ?? "创建失败");
      return;
    }
    element.reset();
    setShowCreate(false);
    await refresh();
  }

  return (
    <details id="users" open className="group min-w-0 scroll-mt-20 overflow-hidden">
      <summary className="border-line flex cursor-pointer list-none items-center justify-between border-b px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
        <div>
          <p className="kicker">工作区成员</p>
          <h2 className="mt-1 text-lg font-semibold">
            用户 <span className="text-soft font-normal">· {filteredUsers.length}</span>
          </h2>
        </div>
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="text-soft h-4 w-4 shrink-0 fill-none stroke-current transition-transform group-open:rotate-180"
          strokeWidth="1.8"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="border-line flex flex-wrap items-center justify-end gap-2 border-b px-5 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex flex-wrap gap-1" aria-label="筛选用户">
            {USER_FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                aria-pressed={filter === item.value}
                className={`chip ${filter === item.value ? "bg-foreground text-background" : ""}`}
              >
                {item.label} · {filterCounts[item.value]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowCreate((value) => !value)}
            aria-expanded={showCreate}
            className="inline-flex items-center gap-2 rounded-md bg-foreground px-3 py-2 text-xs font-bold text-background transition hover:opacity-80"
          >
            <span className="text-base leading-none">{showCreate ? "×" : "+"}</span>
            {showCreate ? "关闭" : "添加用户"}
          </button>
        </div>
      </div>

      {showCreate ? (
        <form onSubmit={create} className="border-line bg-surface-1 border-b p-5 sm:p-6">
          <div className="mb-4">
            <p className="text-sm font-semibold">创建工作区用户</p>
            <p className="text-soft mt-1 text-xs">为用户分配初始角色和组织，密码可稍后修改。</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="姓名">
              <input
                required
                name="name"
                placeholder="e.g. Marie Laurent"
                className="admin-input"
              />
            </Field>
            <Field label="工作邮箱">
              <input
                required
                name="email"
                type="email"
                placeholder="name@company.com"
                className="admin-input"
              />
            </Field>
            <Field label="临时密码">
              <input
                required
                name="password"
                type="password"
                minLength={12}
                placeholder="12+ characters"
                className="admin-input"
              />
            </Field>
            <Field label="组织类型">
              <select name="organizationType" className="admin-input">
                {ORGS.map((org) => (
                  <option key={org.value} value={org.value}>
                    {org.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="组织">
              <input
                required
                name="organizationName"
                placeholder="组织名称"
                className="admin-input"
              />
            </Field>
            <Field label="访问角色">
              <select name="role" className="admin-input">
                <option value="buyerStaff">{ROLE_LABELS.buyerStaff}</option>
                <option value="buyerAdmin">{ROLE_LABELS.buyerAdmin}</option>
                <option value="wineryStaff">{ROLE_LABELS.wineryStaff}</option>
                <option value="wineryAdmin">{ROLE_LABELS.wineryAdmin}</option>
                <option value="platformAdmin">{ROLE_LABELS.platformAdmin}</option>
              </select>
            </Field>
          </div>
          <div className="mt-5 flex justify-end">
            <button
              disabled={creating}
              className="rounded-full bg-foreground px-5 py-2.5 text-sm font-bold text-background transition hover:opacity-80 disabled:cursor-wait disabled:opacity-50"
            >
              {creating ? "正在创建…" : "创建用户"}
            </button>
          </div>
        </form>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="m-5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <div className="divide-line divide-y">
        {filteredUsers.map((item) => {
          const isCurrentUser = item.id === currentUserId;
          return (
            <article
              key={item.id}
              className="hover:bg-surface-1 grid gap-4 px-5 py-5 transition sm:px-6 lg:grid-cols-[minmax(200px,1.4fr)_minmax(170px,1fr)_120px_100px] lg:items-center"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="bg-surface-3 grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold uppercase">
                  {initials(item.name)}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold">{item.name}</h3>
                    {isCurrentUser ? (
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground">
                        当前账户
                      </span>
                    ) : null}
                  </div>
                  <p className="text-soft mt-1 truncate text-xs">{item.email}</p>
                </div>
              </div>

              <div className="min-w-0">
                <select
                  aria-label={`Organization type for ${item.name}`}
                  value={item.organizationType ?? "chateau"}
                  onChange={(event) =>
                    void update(item.id, {
                      organizationType: event.target.value as OrganizationType,
                    })
                  }
                  className="admin-select"
                >
                  {ORGS.map((org) => (
                    <option key={org.value} value={org.value}>
                      {org.label}
                    </option>
                  ))}
                </select>
                <p className="text-soft mt-1.5 truncate text-xs">
                  {item.organizationName ?? "未设置组织"}
                </p>
              </div>

              <select
                aria-label={`Role for ${item.name}`}
                disabled={isCurrentUser}
                value={item.role}
                onChange={(event) => void update(item.id, { role: event.target.value as Role })}
                className="admin-select disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="platformAdmin">{ROLE_LABELS.platformAdmin}</option>
                <option value="wineryAdmin">{ROLE_LABELS.wineryAdmin}</option>
                <option value="wineryStaff">{ROLE_LABELS.wineryStaff}</option>
                <option value="buyerAdmin">{ROLE_LABELS.buyerAdmin}</option>
                <option value="buyerStaff">{ROLE_LABELS.buyerStaff}</option>
              </select>

              <div className="flex flex-wrap items-center justify-between gap-3 lg:justify-end">
                <StatusBadge status={item.status} />
                {isCurrentUser ? (
                  <span className="text-soft text-[10px] font-bold uppercase tracking-wider">
                    受保护
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      void update(item.id, {
                        status: item.status === "active" ? "disabled" : "active",
                      })
                    }
                    className="decoration-line-strong text-xs font-semibold underline underline-offset-4 transition hover:text-accent"
                  >
                    {item.status === "pending"
                      ? "批准"
                      : item.status === "active"
                        ? "停用"
                        : "启用"}
                  </button>
                )}
                {!isCurrentUser ? (
                  <button
                    type="button"
                    onClick={() =>
                      setResettingUserId((value) => (value === item.id ? null : item.id))
                    }
                    className="decoration-line-strong text-xs font-semibold underline underline-offset-4 transition hover:text-accent"
                  >
                    重置密码
                  </button>
                ) : null}
                {!isCurrentUser ? (
                  <button
                    type="button"
                    onClick={() => void removeUser(item)}
                    className="text-xs font-semibold text-red-500 underline underline-offset-4 transition hover:text-red-400"
                  >
                    删除
                  </button>
                ) : null}
              </div>
              {resettingUserId === item.id ? (
                <form
                  onSubmit={(event) => void resetPassword(event, item.id)}
                  className="flex gap-2 lg:col-span-4 lg:justify-end"
                >
                  <input
                    required
                    name="password"
                    type="password"
                    minLength={12}
                    autoComplete="new-password"
                    placeholder="临时密码 · 至少 12 个字符"
                    className="admin-input max-w-sm"
                  />
                  <button className="rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background">
                    保存密码
                  </button>
                </form>
              ) : null}
            </article>
          );
        })}
        {filteredUsers.length === 0 ? (
          <p className="text-soft px-6 py-12 text-center text-sm">没有符合筛选条件的用户。</p>
        ) : null}
      </div>
    </details>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-soft mb-2 block text-[10px] font-bold uppercase tracking-[0.18em]">
        {label}
      </span>
      {children}
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "active"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : status === "pending"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "bg-surface-3 text-soft";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.15em] ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {{ active: "活跃", pending: "待审核", disabled: "已停用" }[status] ?? status}
    </span>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}
