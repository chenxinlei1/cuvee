"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/auth/types";

const DEMO_EMAIL = "analyst@cuvee.demo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid work email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = (await response.json()) as { error?: string; user?: AuthUser };
      if (!response.ok) {
        setError(data.error ?? "Sign in failed.");
        return;
      }
      window.dispatchEvent(new Event("cuvee-auth-changed"));
      const destination=data.user?.role==="admin"?"/admin":data.user?.organizationType==="chateau"?"/vineyard":data.user?.organizationType==="buyer"?"/reports":"/trade";
      router.push(destination);
      router.refresh();
    } catch {
      setError("Unable to reach the authentication service.");
    } finally {
      setSubmitting(false);
    }
  }

  function useDemoAccount() {
    setEmail(DEMO_EMAIL);
    setPassword("cuvee-demo-2024");
    setError(null);
  }

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_18%_22%,hsl(var(--accent)/0.15),transparent_34%),radial-gradient(circle_at_86%_78%,hsl(var(--chart-3)/0.12),transparent_30%)]"
      />
      <div className="container relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-12 px-7 py-12 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden max-w-xl lg:block">
          <p className="kicker mb-5">Enterprise vintage intelligence</p>
          <h1 className="font-serif text-6xl font-medium leading-[0.95] tracking-tight">
            Decisions grounded in every signal.
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-muted-foreground">
            Combine climate, terroir, public-web evidence, and private vineyard documents in
            one traceable multi-agent workflow.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-card border border-line bg-line">
            <LoginMetric value="6" label="Specialist agents" />
            <LoginMetric value="2" label="RAG evidence paths" />
            <LoginMetric value="100%" label="Traceable runs" />
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="card-lg p-7 sm:p-9">
            <div className="mb-8">
              <p className="kicker">Secure workspace</p>
              <h2 className="mt-3 font-serif text-4xl font-medium">Welcome back</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Sign in to your organization&apos;s Cuvée workspace.
              </p>
            </div>

            <form onSubmit={submit} noValidate>
              <div className="space-y-5">
                <label className="block">
                  <span className="kicker-strong">Work email</span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@company.com"
                    className="mt-2 w-full rounded-xl border border-input bg-surface-1 px-4 py-3 text-sm outline-none transition placeholder:text-soft focus:border-foreground focus:ring-2 focus:ring-ring/20"
                  />
                </label>
                <label className="block">
                  <span className="flex items-center justify-between gap-3">
                    <span className="kicker-strong">Password</span>
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 8 characters"
                    className="mt-2 w-full rounded-xl border border-input bg-surface-1 px-4 py-3 text-sm outline-none transition placeholder:text-soft focus:border-foreground focus:ring-2 focus:ring-ring/20"
                  />
                </label>
              </div>

              <div className="mt-5 flex items-center justify-between gap-4 text-xs">
                <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                    className="h-4 w-4 rounded border-input accent-current"
                  />
                  Remember this device
                </label>
                <button type="button" className="text-foreground underline-offset-4 hover:underline">
                  Forgot password?
                </button>
              </div>

              {error ? (
                <p role="alert" className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 w-full rounded-pill bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>
              <Link href="/register" className="mt-3 block text-center text-xs text-muted-foreground underline-offset-4 hover:underline">Request a new account</Link>

              <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-line" />
                <span className="kicker">Interview demo</span>
                <span className="h-px flex-1 bg-line" />
              </div>

              <button
                type="button"
                onClick={useDemoAccount}
                className="w-full rounded-pill border border-line-strong bg-surface-1 px-5 py-3 text-sm font-bold transition hover:bg-surface-3"
              >
                Fill demo credentials
              </button>
            </form>

            <p className="mt-7 text-center text-xs leading-5 text-muted-foreground">
              Secure server session · Demo analyst: analyst@cuvee.demo / cuvee-demo-2024.{" "}
              <Link href="/" className="text-foreground underline-offset-4 hover:underline">
                Return home
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function LoginMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-background/90 p-5">
      <p className="font-serif text-3xl font-medium">{value}</p>
      <p className="kicker mt-2">{label}</p>
    </div>
  );
}
