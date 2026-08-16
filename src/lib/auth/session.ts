import "server-only";
import { cookies } from "next/headers";
import { findUserBySession } from "./db";
import type { AuthUser } from "./types";

export const SESSION_COOKIE = "cuvee_session";
export const REMEMBERED_SESSION_AGE = 60 * 60 * 24 * 30;
export const BROWSER_SESSION_AGE = 60 * 60 * 12;
export async function sessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}
export async function currentUser(): Promise<AuthUser | null> {
  const token = await sessionToken();
  return token ? findUserBySession(token) : null;
}
export function sessionCookieOptions(maxAge = REMEMBERED_SESSION_AGE) {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge, priority: "high" as const };
}
