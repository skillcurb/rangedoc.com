/**
 * GET /api/auth/oauth/{google|facebook}/callback?code=…&state=…
 * Finishes admin social sign-in. Only existing ADMIN users can log in:
 *  1. match the linked Google/Facebook id, or
 *  2. match a verified email and link the id for next time.
 */
import { NextResponse, type NextRequest } from "next/server";
import { db, t, eq } from "@/lib/db";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/session";
import { fetchProfile, OAUTH_COOKIE, type OAuthProvider } from "@/lib/oauth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const fail = (code: string) => {
    const res = NextResponse.redirect(new URL(`/admin/login?error=${code}`, request.url));
    res.cookies.delete(OAUTH_COOKIE);
    return res;
  };
  if (provider !== "google" && provider !== "facebook") return fail("provider");

  // 1. Check state (CSRF protection)
  let saved: { state?: string; next?: string } = {};
  try {
    saved = JSON.parse(request.cookies.get(OAUTH_COOKIE)?.value ?? "{}");
  } catch {
    /* ignore */
  }
  const sp = request.nextUrl.searchParams;
  if (sp.get("error")) return fail("cancelled");
  if (!saved.state || saved.state !== sp.get("state") || !sp.get("code")) return fail("state");

  try {
    // 2. Get the profile from Google / Facebook
    const profile = await fetchProfile(provider as OAuthProvider, sp.get("code")!);
    const idField = provider === "google" ? "googleId" : "facebookId";
    const idColumn = provider === "google" ? t.users.googleId : t.users.facebookId;

    // 3. Find the admin account
    let user = await db.query.users.findFirst({ where: eq(idColumn, profile.id) });
    if (!user && profile.email && profile.emailVerified) {
      user = await db.query.users.findFirst({ where: eq(t.users.email, profile.email) });
      if (user) {
        // Link the social id for next time (and keep an existing avatar)
        const linked = { [idField]: profile.id, avatar: user.avatar ?? profile.avatar ?? null };
        await db.update(t.users).set(linked).where(eq(t.users.id, user.id));
        user = { ...user, ...linked };
      }
    }
    if (!user || user.role !== "ADMIN") return fail("no_account");

    // 4. Log in – the session cookie is set directly on the redirect response
    await db.update(t.users).set({ lastLoginAt: new Date() }).where(eq(t.users.id, user.id));
    const res = NextResponse.redirect(new URL(saved.next || "/admin", request.url));
    res.cookies.set(SESSION_COOKIE, await signSession({ userId: user.id, role: "ADMIN" }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    res.cookies.delete(OAUTH_COOKIE);
    return res;
  } catch (e) {
    console.error("[oauth]", e);
    return fail("failed");
  }
}
