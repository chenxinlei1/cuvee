"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/Provider";
import { AuthNav } from "@/components/auth/AuthNav";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { canAccessTrade, canAccessVineyard } from "@/lib/auth/types";

export function LocalizedNavLinks() {
  const t = useT();
  const pathname = usePathname();
  const { user, ready } = useCurrentUser();
  return (
    <div className="flex shrink-0 items-center gap-2">
      <div className="flex items-center rounded-lg border border-line bg-surface-1 p-1">
      {ready && user && canAccessVineyard(user) ? (
        <NavLink href="/vineyard" active={pathname.startsWith("/vineyard")}>{t("nav.vineyard")}</NavLink>
      ) : null}
      {ready && user && canAccessTrade(user) ? (
        <NavLink href="/trade" active={pathname.startsWith("/trade")}>{t("nav.trade")}</NavLink>
      ) : null}
      {ready && user ? <NavLink href="/reports" active={pathname.startsWith("/reports")}>{t("nav.reports")}</NavLink> : null}
      <NavLink href="/provenance" active={pathname.startsWith("/provenance")}>{t("nav.provenance")}</NavLink>
      <NavLink href="/blog" active={pathname.startsWith("/blog")}>{t("nav.blog")}</NavLink>
      </div>
      <span className="mx-1 h-6 w-px bg-line" />
      <AuthNav />
    </div>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
        active ? "bg-panel-strong text-foreground shadow-sm" : "text-soft hover:bg-surface-2 hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
