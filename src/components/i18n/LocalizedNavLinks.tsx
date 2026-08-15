"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/Provider";
import { AuthNav } from "@/components/auth/AuthNav";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

export function LocalizedNavLinks() {
  const t = useT();
  const {user}=useCurrentUser();
  return (
    <>
      {(!user||user.role==="admin"||user.organizationType==="chateau")?<NavLink href="/vineyard">{t("nav.vineyard")}</NavLink>:null}
      {(!user||user.role==="admin"||user.organizationType==="negociant"||user.organizationType==="distributor")?<NavLink href="/trade">{t("nav.trade")}</NavLink>:null}
      {user?<NavLink href="/reports">Reports</NavLink>:null}
      <NavLink href="/blog">{t("nav.blog")}</NavLink>
      <span className="mx-2 h-4 w-px bg-line" />
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
