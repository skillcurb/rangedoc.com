/**
 * PROVIDER LOGIN  ( /login )
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { getCurrentUser } from "@/lib/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/AuthForms";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("login", { title: "Provider Login" });
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user?.role === "PROVIDER") redirect(next || "/dashboard");
  return (
    <AuthShell title="Provider Login" subtitle="Manage your profile, appointments and analytics.">
      <div className="max-w-md">
        <LoginForm next={next} />
        <p className="mt-6 text-sm text-navy-700">
          New here?{" "}
          <Link href="/claim-your-profile" className="link">
            Claim your profile
          </Link>{" "}
          or{" "}
          <Link href="/register" className="link">
            create a listing
          </Link>
          .
        </p>
      </div>
    </AuthShell>
  );
}
