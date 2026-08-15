import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/types";
import { listAuditLogs, listUsers } from "@/lib/auth/db";
import { UserManager } from "@/components/admin/UserManager";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, "user:manage")) redirect("/vineyard");
  const [users, logs] = await Promise.all([listUsers(), listAuditLogs()]);
  return (
    <main className="container mx-auto max-w-6xl px-7 py-12">
      <p className="kicker">AOS management</p>
      <h1 className="mt-3 font-serif text-5xl">Access control</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Server-enforced RBAC, active users, and auditable system actions.</p>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <UserManager initialUsers={users} currentUserId={user.id}/>
        <section className="card-lg p-6">
          <h2 className="kicker">Recent audit trail</h2>
          <ul className="mt-5 space-y-3">{logs.length ? logs.map((log) => <li key={log.id} className="rounded-xl border border-line p-3"><strong className="block text-sm">{log.action}</strong><span className="mt-1 block text-xs text-soft">{new Date(log.createdAt).toLocaleString()}</span></li>) : <li className="text-sm text-soft">No activity recorded yet.</li>}</ul>
        </section>
      </div>
    </main>
  );
}
