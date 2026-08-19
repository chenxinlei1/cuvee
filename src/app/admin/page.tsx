import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/auth/session";
import { hasPermission, ROLE_LABELS } from "@/lib/auth/types";
import {
  listAccessRoles,
  listAuditLogs,
  listPermissionDefinitions,
  listUsers,
} from "@/lib/auth/db";
import { listTasksForAdmin } from "@/lib/tasks/store";
import { UserManager } from "@/components/admin/UserManager";
import type { UserFilter } from "@/components/admin/UserManager";
import { RoleManager } from "@/components/admin/RoleManager";
import { TaskQueue } from "@/components/admin/TaskQueue";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  "auth.login": "用户已登录",
  "auth.logout": "用户已退出",
  "auth.login_failed": "登录尝试失败",
  "auth.register": "账户申请已提交",
  "user.created": "用户已创建",
  "user.updated": "用户已更新",
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
    <main className="container mx-auto max-w-[1440px] px-5 py-8 sm:px-7 lg:py-10">
      <header className="border-line border-b pb-7">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="kicker">平台管理</p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl font-medium leading-none">
              访问与权限控制
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              集中管理工作区访问、组织角色与安全活动。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 lg:justify-end">
            <Metric
              value={activeUsers}
              label="活跃用户"
              tone="green"
              href="/admin?users=active#users"
            />
            <Metric
              value={pendingUsers}
              label="待审核"
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

      <div className="border-line flex justify-end border-b py-3">
        <Link
          href="/admin/organizations"
          className="text-soft text-xs font-semibold transition-colors hover:text-foreground"
        >
          组织管理
        </Link>
      </div>

      <div className="grid items-start xl:grid-cols-[minmax(0,1fr)_320px]">
        <UserManager initialUsers={users} currentUserId={user.id} initialFilter={userFilter} />

        <aside className="border-line overflow-hidden border-t xl:sticky xl:top-20 xl:border-l xl:border-t-0">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 [&::-webkit-details-marker]:hidden">
              <div>
                <p className="kicker">安全活动</p>
                <h2 className="mt-1 text-base font-semibold">
                  最近审计记录 <span className="text-soft font-normal">· {logs.length}</span>
                </h2>
              </div>
              <span className="grid h-8 w-8 place-items-center text-muted-foreground transition-transform group-open:rotate-180">
                <ChevronIcon />
              </span>
            </summary>
            <ol className="divide-line border-line divide-y border-t px-5">
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
                <li className="text-soft py-10 text-center text-sm">暂无活动记录。</li>
              )}
            </ol>
          </details>
        </aside>
      </div>
      {hasPermission(user, "role:manage") ? (
        <RoleManager initialRoles={roles} permissionDefinitions={permissions} />
      ) : null}
      {hasPermission(user, "report:read:any") ? <TaskQueue initialTasks={tasks} /> : null}
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
    green: "text-emerald-700 dark:text-emerald-300",
    amber: "text-amber-700 dark:text-amber-300",
    neutral: "text-foreground",
  }[tone];

  return (
    <Link
      href={href}
      aria-label={`Show ${label} users`}
      className="border-line group min-w-20 border-l pl-4 transition hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className={`text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
      <p className="text-soft mt-1 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em]">
        <span>{label}</span>
        <span aria-hidden="true" className="text-sm transition group-hover:translate-x-0.5">
          →
        </span>
      </p>
    </Link>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
