"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/auth/types";
import { defaultAppPath } from "@/lib/auth/types";
import { useT } from "@/lib/i18n/Provider";

const DEMO_EMAIL = "winery-admin@cuvee.demo";

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
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
      setError(t("auth.error.invalid_email"));
      return;
    }
    if (password.length < 8) {
      setError(t("auth.error.short_password"));
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
        setError(t("auth.error.sign_in_failed"));
        return;
      }
      window.dispatchEvent(new Event("cuvee-auth-changed"));
      const destination = data.user ? defaultAppPath(data.user) : "/reports";
      router.push(destination);
      router.refresh();
    } catch {
      setError(t("auth.error.unreachable"));
    } finally {
      setSubmitting(false);
    }
  }

  function useDemoAccount() {
    setEmail(DEMO_EMAIL);
    setPassword("cuvee-winery-2024");
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
          <p className="kicker mb-5">{t("auth.login.eyebrow")}</p>
          <h1 className="font-serif text-6xl font-medium leading-[0.95] tracking-tight">
            {t("auth.login.hero_title")}
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-muted-foreground">
            {t("auth.login.hero_description")}
          </p>
          <div className="border-line bg-line mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-card border">
            <LoginMetric value="6" label={t("auth.login.metric_agents")} />
            <LoginMetric value="2" label={t("auth.login.metric_rag")} />
            <LoginMetric value="100%" label={t("auth.login.metric_traceable")} />
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="card-lg p-7 sm:p-9">
            <div className="mb-8">
              <p className="kicker">{t("auth.login.secure_workspace")}</p>
              <h2 className="mt-3 font-serif text-4xl font-medium">{t("auth.login.welcome")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t("auth.login.description")}</p>
            </div>

            <form onSubmit={submit} noValidate>
              <div className="space-y-5">
                <label className="block">
                  <span className="kicker-strong">{t("auth.login.email")}</span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@company.com"
                    className="bg-surface-1 placeholder:text-soft mt-2 w-full rounded-xl border border-input px-4 py-3 text-sm outline-none transition focus:border-foreground focus:ring-2 focus:ring-ring/20"
                  />
                </label>
                <label className="block">
                  <span className="flex items-center justify-between gap-3">
                    <span className="kicker-strong">{t("auth.login.password")}</span>
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {showPassword ? t("auth.login.hide") : t("auth.login.show")}
                    </button>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={t("auth.login.password_placeholder")}
                    className="bg-surface-1 placeholder:text-soft mt-2 w-full rounded-xl border border-input px-4 py-3 text-sm outline-none transition focus:border-foreground focus:ring-2 focus:ring-ring/20"
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
                  {t("auth.login.remember")}
                </label>
                <button
                  type="button"
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  {t("auth.login.forgot")}
                </button>
              </div>

              {error ? (
                <p
                  role="alert"
                  className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 w-full rounded-pill bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
              >
                {submitting ? t("auth.login.submitting") : t("auth.login.submit")}
              </button>
              <Link
                href="/register"
                className="mt-3 block text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                {t("auth.login.request_account")}
              </Link>

              <div className="my-6 flex items-center gap-3">
                <span className="bg-line h-px flex-1" />
                <span className="kicker">{t("auth.login.demo")}</span>
                <span className="bg-line h-px flex-1" />
              </div>

              <button
                type="button"
                onClick={useDemoAccount}
                className="border-line-strong bg-surface-1 hover:bg-surface-3 w-full rounded-pill border px-5 py-3 text-sm font-bold transition"
              >
                {t("auth.login.fill_demo")}
              </button>
            </form>

            <p className="mt-7 text-center text-xs leading-5 text-muted-foreground">
              {t("auth.login.session_note")}{" "}
              <Link href="/" className="text-foreground underline-offset-4 hover:underline">
                {t("auth.login.return_home")}
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
