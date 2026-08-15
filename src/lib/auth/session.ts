import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { findUserById } from "./db";
import type { AuthUser } from "./types";

export const SESSION_COOKIE = "cuvee_session";
const MAX_AGE = 60 * 60 * 24 * 7;
function secret(): string { return process.env.CUVEE_AUTH_SECRET || "cuvee-local-demo-secret-change-before-production"; }
function sign(value: string): string { return createHmac("sha256", secret()).update(value).digest("base64url"); }
export function createSessionToken(user: AuthUser): string {
  const payload = Buffer.from(JSON.stringify({ sub: user.id, exp: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
function decodeToken(token: string): { sub: string; exp: number } | null {
  const [payload, signature] = token.split("."); if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload)); const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try { const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub: string; exp: number };
    return typeof value.sub === "string" && value.exp > Date.now() ? value : null;
  } catch { return null; }
}
export async function currentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? decodeToken(token) : null;
  return session ? findUserById(session.sub) : null;
}
export const sessionCookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE };
