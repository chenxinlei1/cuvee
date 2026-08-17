"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/auth/types";
import { hasPermission, ROLE_LABELS } from "@/lib/auth/types";
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
    <div className="flex items-center gap-2">
      {hasPermission(user, "user:manage") ? (
        <Link href="/admin" className="chip">
          Platform Admin
        </Link>
      ) : null}
      {hasPermission(user, "user:manage:organization") && !hasPermission(user, "user:manage") ? (
        <Link href="/admin/organizations" className="chip">
          Org Admin
        </Link>
      ) : null}
      <Link href="/account/security" className="border-line hidden rounded-pill border px-3 py-2 text-xs md:inline">
        {user.name} ·{" "}
        <span className="text-soft uppercase">
          {user.organizationType ?? "unassigned"} / {ROLE_LABELS[user.role]}
        </span>
      </Link>
      <button
        className="chip"
        type="button"
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          setUser(null);
          router.push("/login");
          router.refresh();
        }}
      >
        Sign out
      </button>
    </div>
  );
}
