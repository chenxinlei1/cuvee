"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/Provider";
import { AuthNav } from "@/components/auth/AuthNav";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { canAccessTrade, canAccessVineyard } from "@/lib/auth/types";

export function LocalizedNavLinks() {
  const t = useT();
  const { user, ready } = useCurrentUser();
  return (
    <>
      {ready && user && canAccessVineyard(user) ? (
        <NavLink href="/vineyard">{t("nav.vineyard")}</NavLink>
      ) : null}
      {ready && user && canAccessTrade(user) ? (
        <NavLink href="/trade">{t("nav.trade")}</NavLink>
      ) : null}
      {ready && user ? <NavLink href="/reports">Reports</NavLink> : null}
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
