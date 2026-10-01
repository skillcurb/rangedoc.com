/**
 * ADMIN LOGIN ( /admin/login ) – separate from the provider login.
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { LoginForm } from "@/components/auth/AuthForms";
import { enabledOAuth } from "@/lib/oauth";
import { FacebookIcon } from "@/components/ui/SocialIcons";
import { Logo } from "@/components/site/Logo";

export const metadata: Metadata = { title: "Admin Login", robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  no_account: "That Google/Facebook account is not linked to an admin user. Ask an administrator to add your email in Admin → Users.",
  state: "The sign-in session expired. Please try again.",
  cancelled: "Sign-in was cancelled.",
  failed: "Social sign-in failed. Check the keys in Admin → Settings → Social login.",
  disabled: "That sign-in method is turned off.",
};

/** Google "G" logo */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const oauth = await enabledOAuth();
  const user = await getCurrentUser();
  if (user?.role === "ADMIN") redirect(next || "/admin");
  const s = await getSettings();
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-brand-900 p-4">
      <div className="blob top-[-120px] left-[-100px] size-[420px] bg-brand-500/40" aria-hidden />
      <div className="blob right-[-120px] bottom-[-140px] size-[460px] bg-navy-400/40 [animation-delay:-8s]" aria-hidden />
      <div className="animate-pop-in relative w-full max-w-md rounded-2xl bg-white/95 p-8 shadow-pop backdrop-blur">
        <Logo siteName={s.general.siteName} logo={s.general.logo} />
        <h1 className="mt-6 flex items-center gap-2 text-2xl font-extrabold">
          <ShieldCheck className="size-6 text-brand-600" /> Admin sign in
        </h1>
        <p className="mb-6 text-sm text-muted">Restricted area. Authorized staff only.</p>
        {error && ERRORS[error] && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{ERRORS[error]}</p>}
        {(oauth.google || oauth.facebook) && (
          <div className="mb-5 space-y-2">
            {oauth.google && (
              <a href={`/api/auth/oauth/google/start?next=${encodeURIComponent(next ?? "/admin")}`} className="btn-light w-full py-3 shadow-sm">
                <GoogleIcon /> Continue with Google
              </a>
            )}
            {oauth.facebook && (
              <a href={`/api/auth/oauth/facebook/start?next=${encodeURIComponent(next ?? "/admin")}`} className="btn w-full bg-[#1877F2] py-3 text-white shadow-sm hover:bg-[#0f5bd0]">
                <FacebookIcon className="size-5" /> Continue with Facebook
              </a>
            )}
            <div className="flex items-center gap-3 py-2 text-xs text-muted">
              <span className="h-px flex-1 bg-line" /> or sign in with email <span className="h-px flex-1 bg-line" />
            </div>
          </div>
        )}
        <LoginForm role="ADMIN" next={next} />
      </div>
    </div>
  );
}
