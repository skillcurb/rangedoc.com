/**
 * Server-side auth helpers (database aware).
 * ------------------------------------------------------------------
 *  - getCurrentUser()   → the logged-in user or null
 *  - requireAdmin()     → user, or redirect to /admin/login
 *  - requireProvider()  → user + provider profile, or redirect to /login
 *  - startSession()/endSession() set/clear the cookie
 */
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db, t, eq } from "@/lib/db";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession, type SessionPayload } from "@/lib/session";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/** Write the session cookie after a successful login / registration */
export async function startSession(payload: SessionPayload) {
  const token = await signSession(payload);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  await db.update(t.users).set({ lastLoginAt: new Date() }).where(eq(t.users.id, payload.userId));
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Read + verify the cookie. `cache` dedupes calls within one request. */
export const getSession = cache(async () => {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
});

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const user = await db.query.users.findFirst({
    where: eq(t.users.id, session.userId),
    columns: { id: true, name: true, email: true, role: true, avatar: true, providerId: true },
  });
  return user ?? null;
});

/** Use at the top of admin pages / actions */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/admin/login");
  return user;
}

/** Use at the top of provider dashboard pages / actions */
export async function requireProvider() {
  const user = await getCurrentUser();
  if (!user || user.role !== "PROVIDER") redirect("/login");
  if (!user.providerId) redirect("/register?step=profile");
  return user as typeof user & { providerId: number };
}

/** For server actions that should throw instead of redirect */
export async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("Unauthorized");
  return user;
}
