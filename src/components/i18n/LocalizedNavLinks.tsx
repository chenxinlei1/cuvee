"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/Provider";
import { AuthNav } from "@/components/auth/AuthNav";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { hasPermission } from "@/lib/auth/types";

export function LocalizedNavLinks() {
  const t = useT();
  const { user } = useCurrentUser();
  return (
    <>
      {!user || hasPermission(user, "analysis:run") ? (
        <NavLink href="/vineyard">{t("nav.vineyard")}</NavLink>
      ) : null}
      {!user || hasPermission(user, "analysis:run") ? (
        <NavLink href="/trade">{t("nav.trade")}</NavLink>
      ) : null}
      {user ? <NavLink href="/reports">Reports</NavLink> : null}
      <NavLink href="/blog">{t("nav.blog")}</NavLink>
      <span className="bg-line mx-2 h-4 w-px" />
      <AuthNav />
    </>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="chip">
      {children}
    </Link>
  );
}
