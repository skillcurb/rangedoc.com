/** FORGOT PASSWORD ( /forgot-password ) */
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Forgot Password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Forgot your password?" subtitle="Enter your email and we'll send you a reset link." aside={false}>
      <div className="max-w-md">
        <ForgotForm />
      </div>
    </AuthShell>
  );
}
