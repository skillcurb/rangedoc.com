/**
 * Admin social sign-in (OAuth 2.0) – Google and Facebook.
 * ------------------------------------------------------------------
 * Flow:
 *   /api/auth/oauth/{google|facebook}/start     → redirect to the provider
 *   /api/auth/oauth/{google|facebook}/callback  → exchange code, read email,
 *        find the ADMIN user (by linked id, else by email) and log them in.
 *
 * Security:
 *  - A random `state` value is stored in an httpOnly cookie and checked on
 *    return (prevents CSRF / login forgery).
 *  - Nobody can create an admin account by signing in: the Google/Facebook
 *    email must belong to an existing admin user (Admin → Users).
 *
 * Keys are set in Admin → Settings → Social login. Redirect URLs to register
 * with Google / Facebook:  {SITE_URL}/api/auth/oauth/google/callback
 *                          {SITE_URL}/api/auth/oauth/facebook/callback
 */
import "server-only";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/utils";

export type OAuthProvider = "google" | "facebook";
export type OAuthProfile = { id: string; email: string | null; emailVerified: boolean; name: string | null; avatar: string | null };

export const OAUTH_COOKIE = "rd_oauth";

export function callbackUrl(provider: OAuthProvider) {
  return siteUrl(`/api/auth/oauth/${provider}/callback`);
}

/** Which providers are switched on and configured */
export async function enabledOAuth() {
  const s = await getSettings();
  return {
    google: s.auth.google.enabled && !!s.auth.google.clientId && !!s.auth.google.clientSecret,
    facebook: s.auth.facebook.enabled && !!s.auth.facebook.appId && !!s.auth.facebook.appSecret,
  };
}

/** URL of the provider's consent screen */
export async function authorizeUrl(provider: OAuthProvider, state: string) {
  const s = await getSettings();
  if (provider === "google") {
    const p = new URLSearchParams({
      client_id: s.auth.google.clientId,
      redirect_uri: callbackUrl("google"),
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
  }
  const p = new URLSearchParams({ client_id: s.auth.facebook.appId, redirect_uri: callbackUrl("facebook"), response_type: "code", scope: "email,public_profile", state });
  return `https://www.facebook.com/v21.0/dialog/oauth?${p}`;
}

/** Exchange the returned code for the user's profile */
export async function fetchProfile(provider: OAuthProvider, code: string): Promise<OAuthProfile> {
  const s = await getSettings();
  if (provider === "google") {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: s.auth.google.clientId,
        client_secret: s.auth.google.clientSecret,
        redirect_uri: callbackUrl("google"),
        grant_type: "authorization_code",
      }),
    });
    const token = (await tokenRes.json()) as { access_token?: string };
    if (!token.access_token) throw new Error("Google sign-in failed");
    const me = (await (await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` } })).json()) as {
      sub: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };
    return { id: me.sub, email: me.email?.toLowerCase() ?? null, emailVerified: !!me.email_verified, name: me.name ?? null, avatar: me.picture ?? null };
  }

  const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
  tokenUrl.search = new URLSearchParams({ client_id: s.auth.facebook.appId, client_secret: s.auth.facebook.appSecret, redirect_uri: callbackUrl("facebook"), code }).toString();
  const token = (await (await fetch(tokenUrl)).json()) as { access_token?: string };
  if (!token.access_token) throw new Error("Facebook sign-in failed");
  const me = (await (await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${encodeURIComponent(token.access_token)}`)).json()) as {
    id: string;
    name?: string;
    email?: string;
    picture?: { data?: { url?: string } };
  };
  // Facebook only returns emails that the user has confirmed
  return { id: me.id, email: me.email?.toLowerCase() ?? null, emailVerified: !!me.email, name: me.name ?? null, avatar: me.picture?.data?.url ?? null };
}
