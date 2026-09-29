/**
 * GET /api/auth/oauth/{google|facebook}/start?next=/admin
 * Starts admin social sign-in: stores a random `state` in a cookie and
 * redirects to Google / Facebook.
 */
import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { authorizeUrl, enabledOAuth, OAUTH_COOKIE, type OAuthProvider } from "@/lib/oauth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (provider !== "google" && provider !== "facebook") return NextResponse.redirect(new URL("/admin/login", request.url));
  const enabled = await enabledOAuth();
  if (!enabled[provider]) return NextResponse.redirect(new URL("/admin/login?error=disabled", request.url));

  const next = request.nextUrl.searchParams.get("next") ?? "/admin";
  const state = crypto.randomBytes(24).toString("hex");
  const res = NextResponse.redirect(await authorizeUrl(provider as OAuthProvider, state));
  res.cookies.set(OAUTH_COOKIE, JSON.stringify({ state, next: next.startsWith("/") && !next.startsWith("//") ? next : "/admin" }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
