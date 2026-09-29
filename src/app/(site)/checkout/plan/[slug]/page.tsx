/**
 * PLAN CHECKOUT  ( /checkout/plan/{slug} )
 * Logged-out visitors first create their provider account (minimum details),
 * then return here to pay with the payment methods enabled in the admin.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Check, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getSettings, paymentMethodList } from "@/lib/settings";
import { INTERVAL_LABEL } from "@/lib/plans";
import { formatMoney, jsonStringArray, providerName } from "@/lib/utils";
import { PlanCheckoutForm } from "@/components/checkout/CheckoutForms";
import { RegisterForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function PlanCheckoutPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ provider?: string }> }) {
  const { slug } = await params;
  const { provider: claimId } = await searchParams;
  const plan = await prisma.plan.findUnique({ where: { slug } });
  if (!plan || !plan.active) notFound();
  if (plan.isFree) redirect("/register");

  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  const methods = paymentMethodList(settings).map(({ id, label }) => ({ id, label }));
  const provider = user?.providerId ? await prisma.provider.findUnique({ where: { id: user.providerId } }) : null;
  const claimProvider = !user && claimId ? await prisma.provider.findUnique({ where: { id: Number(claimId) }, include: { city: true } }) : null;
  const cities = user ? [] : await prisma.city.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, stateCode: true } });

  return (
    <div className="bg-surface py-10">
      <div className="container-x grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="card p-6 sm:p-8">
          <h1 className="text-3xl font-extrabold">Checkout</h1>
          {user?.role === "PROVIDER" ? (
            <>
              <p className="mt-1 mb-6 text-navy-700">
                Upgrading <b>{provider ? providerName(provider) : user.name}</b> to <b>{plan.name}</b>.
              </p>
              <PlanCheckoutForm planSlug={plan.slug} methods={methods} defaults={{ name: user.name, email: user.email }} />
            </>
          ) : user ? (
            <p className="mt-4 text-sm text-red-700">You are logged in as an admin. Log in with a provider account to buy a plan.</p>
          ) : (
            <>
              <p className="mt-1 mb-6 text-navy-700">
                Step 1 of 2 — create your provider account. Already have one?{" "}
                <Link href={`/login?next=/checkout/plan/${plan.slug}`} className="link">
                  Log in
                </Link>
              </p>
              <RegisterForm
                claim={claimProvider && claimProvider.claimStatus === "UNCLAIMED" ? { id: claimProvider.id, name: providerName(claimProvider), city: claimProvider.city ? `${claimProvider.city.name}, ${claimProvider.city.stateCode}` : "" } : null}
                cities={cities}
                next={`/checkout/plan/${plan.slug}`}
              />
            </>
          )}
        </div>

        <aside className="card h-fit p-6">
          <p className="text-xs font-bold tracking-widest text-brand-700 uppercase">Order summary</p>
          <h2 className="mt-2 text-2xl font-bold">{plan.name}</h2>
          <p className="font-display text-3xl font-extrabold text-navy-900">
            {formatMoney(plan.priceCents)}
            <span className="text-sm font-medium text-muted">{INTERVAL_LABEL[plan.interval]}</span>
          </p>
          <ul className="mt-4 space-y-2">
            {jsonStringArray(plan.features).map((f) => (
              <li key={f} className="flex gap-2 text-sm text-navy-800">
                <Check className="size-4 shrink-0 text-brand-600" /> {f}
              </li>
            ))}
          </ul>
          <p className="mt-6 flex items-center gap-2 text-xs text-muted">
            <ShieldCheck className="size-4 text-brand-600" /> Secure checkout · {plan.priceNote || "Cancel anytime"}
          </p>
        </aside>
      </div>
    </div>
  );
}
