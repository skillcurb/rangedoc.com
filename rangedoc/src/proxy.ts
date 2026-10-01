/**
 * Next.js 16 "proxy" (formerly middleware).
 * ------------------------------------------------------------------
 * Runs before matching routes render. We use it for two jobs:
 *   1. Protect /admin/* and /dashboard/* – bounce visitors without a valid
 *      session to the right login page (pages also re-check on the server).
 *   2. Give every visitor an anonymous `rd_vid` cookie so analytics can count
 *      unique visitors and repeat visits.
 */
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  // ---- Admin area --------------------------------------------------
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!session || session.role !== "ADMIN") {
      const url = new URL("/admin/login", request.url);
      url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }
  }

  // ---- Provider dashboard -----------------------------------------
  if (pathname.startsWith("/dashboard")) {
    if (!session || session.role !== "PROVIDER") {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }
  }

  // ---- Anonymous visitor id (1 year) ------------------------------
  const response = NextResponse.next();
  if (!request.cookies.get("rd_vid")) {
    response.cookies.set("rd_vid", crypto.randomUUID(), {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  return response;
}

export const config = {
  // Skip static files, images and API routes
  matcher: ["/((?!api|_next/static|_next/image|uploads|seed|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|webp|svg|gif|ico)$).*)"],
};
