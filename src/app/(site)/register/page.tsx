/**
 * PROVIDER REGISTRATION  ( /register , /register?provider=ID to claim )
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { pageMetadata } from "@/lib/seo";
import { getCurrentUser } from "@/lib/auth";
import { providerName } from "@/lib/utils";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/AuthForms";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("register", { title: "Create Your Provider Account" });
}

type Props = { searchParams: Promise<{ provider?: string; next?: string }> };

export default async function RegisterPage({ searchParams }: Props) {
  const { provider: providerParam, next } = await searchParams;
  const user = await getCurrentUser();
  if (user?.role === "PROVIDER" && user.providerId) redirect(next || "/dashboard");

  const provider = providerParam ? await prisma.provider.findUnique({ where: { id: Number(providerParam) }, include: { city: true } }) : null;
  const cities = await prisma.city.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, stateCode: true } });
  const alreadyClaimed = provider && provider.claimStatus !== "UNCLAIMED";

  return (
    <AuthShell
      title={provider ? "Claim Your Profile" : "Create Your Free Profile"}
      subtitle={provider ? "Create your account to take control of your listing." : "List your practice for free and start receiving patients."}
    >
      {alreadyClaimed ? (
        <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
          This profile has already been claimed or a claim is being reviewed. If you believe this is a mistake, please{" "}
          <Link href="/contact" className="link">
            contact us
          </Link>
          .
        </p>
      ) : (
        <RegisterForm claim={provider ? { id: provider.id, name: providerName(provider), city: provider.city ? `${provider.city.name}, ${provider.city.stateCode}` : "" } : null} cities={cities} next={next} />
      )}
      <p className="mt-6 text-sm text-navy-700">
        Already have an account?{" "}
        <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="link">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
