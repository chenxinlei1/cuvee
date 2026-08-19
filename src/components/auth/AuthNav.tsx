"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/auth/types";
import { hasPermission } from "@/lib/auth/types";
import { useT } from "@/lib/i18n/Provider";

export function AuthNav() {
  const t = useT();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  async function refresh() {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    const value=response.ok ? ((await response.json()) as { user: AuthUser }).user : null;
    setUser(value ? { ...value, permissions: Array.isArray(value.permissions) ? value.permissions : [] } : null);
  }
  useEffect(() => {
    void refresh();
    window.addEventListener("cuvee-auth-changed", refresh);
    return () => window.removeEventListener("cuvee-auth-changed", refresh);
  }, []);

  if (!user)
    return (
      <Link href="/login" className="chip">
        {t("nav.sign_in")}
      </Link>
    );
  return (
    <div className="flex shrink-0 items-center gap-2">
      {hasPermission(user, "user:manage") ? (
        <Link href="/admin" className="whitespace-nowrap px-2 py-2 text-xs font-semibold text-soft transition-colors hover:text-foreground">
          {t("auth.nav.platform_admin")}
        </Link>
      ) : null}
      {hasPermission(user, "user:manage:organization") && !hasPermission(user, "user:manage") ? (
        <Link href="/admin/organizations" className="whitespace-nowrap px-2 py-2 text-xs font-semibold text-soft transition-colors hover:text-foreground">
          {t("auth.nav.organization_admin")}
        </Link>
      ) : null}
      <Link href="/account/security" className="group flex items-center gap-2 rounded-lg border border-line bg-surface-1 px-2.5 py-1.5 transition-colors hover:bg-surface-2">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-xs font-bold text-background">
          {user.name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="hidden min-w-0 leading-tight xl:block">
          <span className="block max-w-32 truncate text-xs font-semibold">{user.name}</span>
          <span className="text-soft block max-w-32 truncate text-[10px]">
            {t(`auth.role.${user.role.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)}` as Parameters<typeof t>[0])}
          </span>
        </span>
      </Link>
      <button
        className="whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-semibold text-soft transition-colors hover:bg-surface-2 hover:text-foreground"
        type="button"
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          setUser(null);
          router.push("/login");
          router.refresh();
        }}
      >
        {t("auth.nav.sign_out")}
      </button>
    </div>
  );
}
