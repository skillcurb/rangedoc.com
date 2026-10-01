/** RESET PASSWORD ( /reset-password?token=… ) */
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Reset Password", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Choose a new password" aside={false}>
      <div className="max-w-md">{token ? <ResetForm token={token} /> : <p className="text-sm text-red-700">Missing reset token.</p>}</div>
    </AuthShell>
  );
}
