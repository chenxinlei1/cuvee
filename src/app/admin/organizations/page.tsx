import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { defaultAppPath, hasPermission } from "@/lib/auth/types";
import { listOrganizationsFor } from "@/lib/auth/orgs";
import { OrganizationManager } from "@/components/admin/OrganizationManager";

export const dynamic = "force-dynamic";

export default async function OrganizationsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, "user:manage") && !hasPermission(user, "user:manage:organization"))
    redirect(defaultAppPath(user));

  const [organizations] = await Promise.all([listOrganizationsFor(user)]);
  const isPlatform = hasPermission(user, "user:manage");
  return (
    <main className="container mx-auto max-w-7xl px-5 py-8 sm:px-7 lg:py-10">
      <header className="border-line bg-surface-1 relative overflow-hidden rounded-[2rem] border px-6 py-7 sm:px-9 sm:py-9">
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="kicker">Organization management</p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl font-medium leading-none sm:text-5xl">
              Organizations
            </h1>
            <p className="text-soft mt-4 max-w-2xl text-sm leading-6">
              {isPlatform
                ? "Create organizations, invite members, and manage roles across the platform."
                : "Manage the members and roles of your organization."}
            </p>
          </div>
          <Link href={isPlatform ? "/admin" : "/"} className="chip shrink-0">
            {isPlatform ? "← Platform Admin" : "← Back"}
          </Link>
        </div>
      </header>

      <OrganizationManager
        initialOrganizations={organizations}
        canCreate={isPlatform}
        currentUserId={user.id}
        myOrganizationId={user.organizationId}
      />
    </main>
  );
}
