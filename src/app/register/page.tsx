"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { getChateauList } from "@/lib/wine/chateau-points";
import type { OrganizationType } from "@/lib/auth/types";

export default function RegisterPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [organizationType, setOrganizationType] = useState<OrganizationType | "">("");
  const [organizationName, setOrganizationName] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    setLoading(true);
    setError(null);
    setMessage(null);
    setDevUrl(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
          organizationType: form.get("organizationType"),
          organizationName: form.get("organizationName"),
        }),
      });
      const data = (await response.json()) as {
        devUrl?: string;
        error?: string;
        message?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Registration failed");
        return;
      }
      setMessage(data.message ?? "Submitted");
      setDevUrl(data.devUrl ?? null);
      element.reset();
      setOrganizationType("");
      setOrganizationName("");
    } catch {
      setError("Registration service unavailable");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center px-7 py-12">
      <section className="card-lg w-full p-8">
        <p className="kicker">Request access</p>
        <h1 className="mt-3 font-serif text-4xl">Create account</h1>
        <p className="mt-2 text-sm text-soft">
          Choose your wine-supply-chain organization. Admin approval is required.
        </p>
        <form autoComplete="off" onSubmit={submit} className="mt-7 space-y-4">
          <input
            required
            name="name"
            minLength={2}
            autoComplete="off"
            placeholder="Full name"
            className="w-full rounded-md border border-line bg-surface-1 px-4 py-3"
          />
          <input
            required
            name="email"
            type="email"
            autoComplete="off"
            placeholder="Work email"
            className="w-full rounded-md border border-line bg-surface-1 px-4 py-3"
          />
          <select
            required
            name="organizationType"
            value={organizationType}
            onChange={(event) => {
              setOrganizationType(event.target.value as OrganizationType | "");
              setOrganizationName("");
            }}
            className="w-full rounded-md border border-line bg-surface-1 px-4 py-3"
          >
            <option value="" disabled>
              Select organization type
            </option>
            <option value="chateau">酒庄 · Château</option>
            <option value="negociant">酒商 · Négociant</option>
            <option value="distributor">经销商 · Distributor</option>
            <option value="buyer">采购方 · Buyer</option>
          </select>
          {organizationType === "chateau" ? (
            <select
              required
              name="organizationName"
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              className="w-full rounded-md border border-line bg-surface-1 px-4 py-3"
            >
              <option value="" disabled>
                Select château
              </option>
              {getChateauList().map((chateau) => (
                <option key={chateau.name} value={chateau.name}>
                  {chateau.name} · {chateau.aoc}
                </option>
              ))}
              <option value="New château application">申请添加新酒庄</option>
            </select>
          ) : organizationType ? (
            <input
              required
              name="organizationName"
              minLength={2}
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              autoComplete="off"
              placeholder="Organization name"
              className="w-full rounded-md border border-line bg-surface-1 px-4 py-3"
            />
          ) : null}
          <input
            required
            name="password"
            type="password"
            minLength={10}
            autoComplete="new-password"
            placeholder="Password · at least 10 characters"
            className="w-full rounded-md border border-line bg-surface-1 px-4 py-3"
          />
          <button
            disabled={loading}
            className="w-full rounded-pill bg-foreground px-4 py-3 font-bold text-background disabled:opacity-50"
          >
            {loading ? "Submitting…" : "Submit registration"}
          </button>
        </form>
        {message ? (
          <p className="mt-4 rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-600">
            {message}
          </p>
        ) : null}
        {devUrl ? (
          <Link
            href={devUrl}
            className="mt-3 block rounded-md bg-amber-500/10 p-3 text-center text-sm font-medium text-amber-700 underline dark:text-amber-300"
          >
            Verify email in this development environment
          </Link>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-md bg-red-500/10 p-3 text-sm text-red-500">{error}</p>
        ) : null}
        <Link href="/login" className="mt-6 block text-center text-sm underline">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
