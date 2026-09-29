/** PAYMENT CANCELLED ( /checkout/cancel ) */
import type { Metadata } from "next";
import Link from "next/link";
import { XCircle } from "lucide-react";

export const metadata: Metadata = { title: "Payment cancelled", robots: { index: false } };

export default async function CancelPage({ searchParams }: { searchParams: Promise<{ kind?: string; reason?: string }> }) {
  const { kind, reason } = await searchParams;
  return (
    <div className="bg-surface py-16">
      <div className="container-x max-w-xl">
        <div className="card p-8 text-center">
          <XCircle className="mx-auto size-16 text-red-500" />
          <h1 className="mt-4 text-3xl font-extrabold">Payment not completed</h1>
          <p className="mt-2 text-navy-700">{reason === "error" ? "Something went wrong while confirming your payment. You have not been charged twice — please try again or contact us." : "Your payment was cancelled. Nothing was charged."}</p>
          <Link href={kind === "plan" ? "/claim-your-profile#pricing" : "/checkout"} className="btn-primary mt-6">
            Try again
          </Link>
        </div>
      </div>
    </div>
  );
}
