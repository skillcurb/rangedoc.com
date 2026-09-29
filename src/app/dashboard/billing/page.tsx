/** DASHBOARD → BILLING & PLAN ( /dashboard/billing ) */
import { prisma } from "@/lib/prisma";
import { getDashboard } from "@/lib/dashboard";
import { formatDate, formatMoney, jsonStringArray } from "@/lib/utils";
import { PageHeader, Panel, StatusBadge } from "@/components/panel/PanelUi";
import { PricingCards } from "@/components/claim/PricingCards";

export const metadata = { title: "Billing & Plan" };

export default async function BillingPage() {
  const { provider, features } = await getDashboard();
  const [plans, orders] = await Promise.all([
    prisma.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.planOrder.findMany({ where: { providerId: provider.id }, orderBy: { createdAt: "desc" }, include: { plan: true } }),
  ]);
  const currentId = features.isPaid ? provider.planId : plans.find((p) => p.isFree)?.id;
  return (
    <div className="space-y-6">
      <PageHeader title="Billing & Plan" />
      <Panel title="Current plan">
        <p className="text-lg font-bold text-navy-900">{features.planName}</p>
        <p className="text-sm text-navy-700">
          {features.isPaid ? (provider.planExpiresAt ? `Active until ${formatDate(provider.planExpiresAt)}. Renew any time to extend.` : "Lifetime access.") : "You're on the free plan."}
        </p>
        <ul className="mt-3 grid gap-1 text-sm text-navy-700 sm:grid-cols-3">
          <li>Photos: {features.maxPhotos >= 100 ? "Unlimited" : features.maxPhotos}</li>
          <li>Locations: {features.maxLocations}</li>
          <li>FAQs: {features.maxFaqs}</li>
          <li>Reviews: {features.allowReviews ? "Yes" : "No"}</li>
          <li>Save & share: {features.allowShareSave ? "Yes" : "No"}</li>
          <li>Analytics: {features.allowAnalytics ? "Full" : "Basic"}</li>
        </ul>
      </Panel>
      <div>
        <h2 className="mb-4 text-xl font-bold">{features.isPaid ? "Renew or change plan" : "Upgrade your plan"}</h2>
        <PricingCards
          currentPlanId={features.isPaid ? currentId : null}
          hrefFor={(p) => (p.isFree ? "/dashboard" : `/checkout/plan/${p.slug}`)}
          plans={plans.filter((p) => !p.isFree || !features.isPaid).map((p) => ({ ...p, features: jsonStringArray(p.features) }))}
        />
      </div>
      <Panel title="Payment history">
        {!orders.length ? (
          <p className="text-sm text-muted">No payments yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted uppercase">
              <tr>
                <th className="py-2">Order</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="py-2 font-mono text-xs">{o.orderNumber}</td>
                  <td>{o.plan.name}</td>
                  <td>{formatMoney(o.amountCents)}</td>
                  <td className="capitalize">{o.paymentMethod}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>{formatDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
