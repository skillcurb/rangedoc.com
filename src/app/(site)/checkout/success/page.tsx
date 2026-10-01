/**
 * ORDER / PLAN SUCCESS  ( /checkout/success?kind=plan|order&order=… )
 */
import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { db, t, eq } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/utils";
import { ClearCartOnMount } from "@/components/checkout/CheckoutForms";

export const metadata: Metadata = { title: "Thank you", robots: { index: false } };

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ kind?: string; order?: string }> }) {
  const { kind, order } = await searchParams;
  const s = await getSettings();
  const planOrder = kind === "plan" && order ? await db.query.planOrders.findFirst({ where: eq(t.planOrders.orderNumber, order), with: { plan: true } }) : null;
  const productOrder = kind === "order" && order ? await db.query.orders.findFirst({ where: eq(t.orders.orderNumber, order) }) : null;
  const status = planOrder?.status ?? productOrder?.status;
  const paid = status === "PAID";

  return (
    <div className="bg-surface py-16">
      {kind === "order" && <ClearCartOnMount />}
      <div className="container-x max-w-xl">
        <div className="card p-8 text-center">
          {paid ? <CheckCircle2 className="mx-auto size-16 text-brand-600" /> : <Clock className="mx-auto size-16 text-amber-500" />}
          <h1 className="mt-4 text-3xl font-extrabold">{paid ? "Thank you!" : "Order received"}</h1>
          <p className="mt-2 text-navy-700">
            Order <b>{order}</b>
            {planOrder && <> · {planOrder.plan.name} · {formatMoney(planOrder.amountCents)}</>}
            {productOrder && <> · {formatMoney(productOrder.totalCents)}</>}
          </p>
          {paid ? (
            <p className="mt-3 text-sm text-navy-700">{planOrder ? "Your plan is active. New features are unlocked in your dashboard." : "We've emailed your receipt and will let you know when it ships."}</p>
          ) : (
            <p className="mt-3 text-sm text-navy-700">{s.payments.manual.instructions}</p>
          )}
          <Link href={planOrder ? "/dashboard" : "/products"} className="btn-primary mt-6">
            {planOrder ? "Go to dashboard" : "Continue shopping"}
          </Link>
        </div>
      </div>
    </div>
  );
}
