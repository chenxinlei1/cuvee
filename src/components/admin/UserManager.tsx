"use client";

import { FormEvent, useState } from "react";
import type { AuthUser, OrganizationType, Role } from "@/lib/auth/types";
import { ROLE_LABELS } from "@/lib/auth/types";

type ManagedUser = AuthUser & { status: string; createdAt: number };

const ORGS: Array<{ value: OrganizationType; label: string }> = [
  { value: "chateau", label: "Château" },
  { value: "negociant", label: "Négociant" },
  { value: "distributor", label: "Distributor" },
  { value: "buyer", label: "Buyer" },
];

export function UserManager({
  initialUsers,
  currentUserId,
}: {
  initialUsers: ManagedUser[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);

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
      setError(data.error ?? "Update failed");
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
      setError(data.error ?? "Delete failed");
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
      setError(data.error ?? "Create failed");
      return;
    }
    element.reset();
    setShowCreate(false);
    await refresh();
  }

  return (
    <section className="card-lg min-w-0 overflow-hidden">
      <div className="border-line flex items-center justify-between gap-4 border-b px-5 py-4 sm:px-6">
        <div>
          <p className="kicker">Workspace directory</p>
          <h2 className="mt-1 text-lg font-semibold">
            Users <span className="text-soft font-normal">· {users.length}</span>
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((value) => !value)}
          aria-expanded={showCreate}
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background transition hover:opacity-80"
        >
          <span className="text-base leading-none">{showCreate ? "×" : "+"}</span>
          {showCreate ? "Close" : "Add user"}
        </button>
      </div>

      {showCreate ? (
        <form onSubmit={create} className="border-line bg-surface-1 border-b p-5 sm:p-6">
          <div className="mb-4">
            <p className="text-sm font-semibold">Create workspace user</p>
            <p className="text-soft mt-1 text-xs">
              Assign an initial role and organization. The password can be changed later.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="Full name">
              <input
                required
                name="name"
                placeholder="e.g. Marie Laurent"
                className="admin-input"
              />
            </Field>
            <Field label="Work email">
              <input
                required
                name="email"
                type="email"
                placeholder="name@company.com"
                className="admin-input"
              />
            </Field>
            <Field label="Temporary password">
              <input
                required
                name="password"
                type="password"
                minLength={12}
                placeholder="12+ characters"
                className="admin-input"
              />
            </Field>
            <Field label="Organization type">
              <select name="organizationType" className="admin-input">
                {ORGS.map((org) => (
                  <option key={org.value} value={org.value}>
                    {org.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Organization">
              <input
                required
                name="organizationName"
                placeholder="Organization name"
                className="admin-input"
              />
            </Field>
            <Field label="Access role">
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
              {creating ? "Creating…" : "Create user"}
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
        {users.map((item) => {
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
                        You
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
                  {item.organizationName ?? "Organization not set"}
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
                    Protected
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
                      ? "Approve"
                      : item.status === "active"
                        ? "Disable"
                        : "Enable"}
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
                    Reset password
                  </button>
                ) : null}
                {!isCurrentUser ? (
                  <button
                    type="button"
                    onClick={() => void removeUser(item)}
                    className="text-xs font-semibold text-red-500 underline underline-offset-4 transition hover:text-red-400"
                  >
                    Delete
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
                    placeholder="Temporary password · 12+ characters"
                    className="admin-input max-w-sm"
                  />
                  <button className="rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background">
                    Save password
                  </button>
                </form>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
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
      {status}
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
