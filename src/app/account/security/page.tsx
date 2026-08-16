"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SecurityPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState<Array<{id:string;userAgent:string|null;ipAddress:string|null;lastSeenAt:number;current:boolean}>>([]);
  const loadSessions=useCallback(async()=>{const response=await fetch("/api/auth/sessions");if(response.ok)setSessions(((await response.json()) as {sessions:typeof sessions}).sessions);},[]);
  useEffect(()=>{void loadSessions();},[loadSessions]);
  async function revoke(id?:string){await fetch(`/api/auth/sessions${id?`?id=${encodeURIComponent(id)}`:""}`,{method:"DELETE"});await loadSessions();}
  function sessionTime(ms: number): string {
    const d = new Date(ms);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword") ?? "");
    if (newPassword !== form.get("confirmPassword")) {
      setError("New passwords do not match");
      return;
    }
    setSaving(true);
    setError(null);
    const response = await fetch("/api/auth/password", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.get("currentPassword"),
        newPassword,
      }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Password update failed");
      return;
    }
    window.dispatchEvent(new Event("cuvee-auth-changed"));
    router.push("/login?passwordChanged=1");
    router.refresh();
  }

  return (
    <main className="container mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center px-7 py-12">
      <section className="card-lg w-full p-8">
        <p className="kicker">Account security</p>
        <h1 className="mt-3 font-serif text-4xl">Change password</h1>
        <p className="text-soft mt-2 text-sm">Use at least 12 characters. You will be signed out after the change.</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <input required name="currentPassword" type="password" autoComplete="current-password" minLength={8} placeholder="Current password" className="admin-input w-full" />
          <input required name="newPassword" type="password" autoComplete="new-password" minLength={12} placeholder="New password · at least 12 characters" className="admin-input w-full" />
          <input required name="confirmPassword" type="password" autoComplete="new-password" minLength={12} placeholder="Confirm new password" className="admin-input w-full" />
          <button disabled={saving} className="w-full rounded-full bg-foreground px-4 py-3 font-bold text-background disabled:opacity-50">
            {saving ? "Updating…" : "Update password"}
          </button>
        </form>
        {error ? <p role="alert" className="mt-4 rounded-md bg-red-500/10 p-3 text-sm text-red-500">{error}</p> : null}
        <Link href="/" className="mt-6 block text-center text-sm underline">Back to dashboard</Link>
        <div className="my-8 h-px bg-border" />
        <div className="flex items-center justify-between gap-4"><div><p className="kicker">Devices</p><h2 className="mt-2 font-serif text-2xl">Active sessions</h2></div><button type="button" onClick={()=>void revoke()} className="rounded-full border px-4 py-2 text-xs font-bold">Sign out others</button></div>
        <div className="mt-5 space-y-3">{sessions.map((session)=><div key={session.id} className="rounded-xl border p-4 text-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{session.current?"This device":"Another device"}</p><p className="text-soft mt-1 break-all text-xs">{session.userAgent??"Unknown browser"}</p><p className="text-soft mt-1 text-xs">Last active {sessionTime(session.lastSeenAt)}{session.ipAddress?` · ${session.ipAddress}`:""}</p></div>{!session.current?<button type="button" onClick={()=>void revoke(session.id)} className="text-xs underline">Revoke</button>:null}</div></div>)}</div>
      </section>
    </main>
  );
}
