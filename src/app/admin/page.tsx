import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/auth/session";
import { hasPermission, ROLE_LABELS } from "@/lib/auth/types";
import { listAccessRoles, listAuditLogs, listPermissionDefinitions, listUsers } from "@/lib/auth/db";
import { listTasksForAdmin } from "@/lib/tasks/store";
import { UserManager } from "@/components/admin/UserManager";
import type { UserFilter } from "@/components/admin/UserManager";
import { RoleManager } from "@/components/admin/RoleManager";
import { TaskQueue } from "@/components/admin/TaskQueue";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  "auth.login": "User signed in",
  "auth.logout": "User signed out",
  "auth.login_failed": "Failed sign-in attempt",
  "auth.register": "Account requested",
  "user.created": "User created",
  "user.updated": "User updated",
};

function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action.replaceAll(".", " · ").replaceAll("_", " ");
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ users?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, "user:manage")) redirect("/vineyard");

  const [users, logs, roles, permissions, tasks] = await Promise.all([
    listUsers(),
    listAuditLogs(),
    listAccessRoles(),
    listPermissionDefinitions(),
    listTasksForAdmin(),
  ]);
  const activeUsers = users.filter((item) => item.status === "active").length;
  const pendingUsers = users.filter((item) => item.status === "pending").length;
  const platformAdmins = users.filter((item) => item.role === "platformAdmin").length;
  const requestedFilter = (await searchParams).users;
  const userFilter: UserFilter = ["active", "pending", "platformAdmin"].includes(
    requestedFilter ?? "",
  )
    ? (requestedFilter as UserFilter)
    : "all";

  return (
    <main className="container mx-auto max-w-7xl px-5 py-8 sm:px-7 lg:py-10">
      <header className="border-line bg-surface-1 relative overflow-hidden rounded-[2rem] border px-6 py-7 sm:px-9 sm:py-9">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-accent/10 blur-3xl"
        />
        <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div>
            <p className="kicker">AOS management · Platform administration</p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl font-medium leading-none sm:text-5xl">
              Access control
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              Manage workspace access, organization roles, and security activity from one place.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Metric
              value={activeUsers}
              label="Active"
              tone="green"
              href="/admin?users=active#users"
            />
            <Metric
              value={pendingUsers}
              label="Pending"
              tone="amber"
              href="/admin?users=pending#users"
            />
            <Metric
              value={platformAdmins}
              label={ROLE_LABELS.platformAdmin}
              tone="neutral"
              href="/admin?users=platformAdmin#users"
            />
          </div>
        </div>
      </header>

      <div className="mt-4 flex justify-end">
        <Link href="/admin/organizations" className="chip">
          Organizations
        </Link>
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <UserManager
          initialUsers={users}
          currentUserId={user.id}
          initialFilter={userFilter}
        />

        <aside className="card-lg overflow-hidden xl:sticky xl:top-20">
          <div className="border-line flex items-center justify-between border-b px-5 py-4">
            <div>
              <p className="kicker">Security activity</p>
              <h2 className="mt-1 text-base font-semibold">Recent audit trail</h2>
            </div>
            <span className="bg-surface-2 grid h-9 w-9 place-items-center rounded-full text-muted-foreground">
              <AuditIcon />
            </span>
          </div>
          <ol className="divide-line divide-y px-5">
            {logs.length ? (
              logs.slice(0, 10).map((log, index) => (
                <li key={log.id} className="relative py-4 pl-6">
                  <span
                    className={`absolute left-0 top-[1.35rem] h-2.5 w-2.5 rounded-full ring-4 ring-background ${
                      log.action.includes("failed") ? "bg-destructive" : "bg-accent"
                    }`}
                  />
                  {index < Math.min(logs.length, 10) - 1 ? (
                    <span className="bg-line absolute bottom-0 left-[4px] top-8 w-px" />
                  ) : null}
                  <p className="text-sm font-semibold capitalize">{actionLabel(log.action)}</p>
                  <p className="text-soft mt-1 text-xs">
                    {new Date(log.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </li>
              ))
            ) : (
              <li className="text-soft py-10 text-center text-sm">No activity recorded yet.</li>
            )}
          </ol>
        </aside>
      </div>
      {hasPermission(user,"role:manage")?<RoleManager initialRoles={roles} permissionDefinitions={permissions}/>:null}
      {hasPermission(user,"report:read:any")?<TaskQueue initialTasks={tasks}/>:null}
    </main>
  );
}

function Metric({
  value,
  label,
  tone,
  href,
}: {
  value: number;
  label: string;
  tone: "green" | "amber" | "neutral";
  href: string;
}) {
  const toneClass = {
    green: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    neutral: "bg-surface-3 text-foreground",
  }[tone];

  return (
    <Link
      href={href}
      aria-label={`Show ${label} users`}
      className="border-line group min-w-20 rounded-2xl border bg-background/70 px-4 py-3 backdrop-blur transition hover:-translate-y-0.5 hover:border-foreground/30 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div
        className={`inline-flex min-w-8 justify-center rounded-full px-2 py-0.5 text-lg font-semibold ${toneClass}`}
      >
        {value}
      </div>
      <p className="text-soft mt-2 flex items-center justify-between gap-2 text-[9px] font-bold uppercase tracking-[0.2em]">
        <span>{label}</span>
        <span aria-hidden="true" className="text-sm transition group-hover:translate-x-0.5">
          →
        </span>
      </p>
    </Link>
  );
}

function AuditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M12 3l7 3v5c0 4.7-2.9 8.1-7 10-4.1-1.9-7-5.3-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
