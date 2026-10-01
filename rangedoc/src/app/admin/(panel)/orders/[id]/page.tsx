/**
 * ADMIN – PRODUCT ORDER DETAIL ( /admin/orders/{id} )
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db, t, eq } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/utils";
import { PageHeader, Panel, StatusBadge } from "@/components/panel/PanelUi";
import { AppImage } from "@/components/ui/AppImage";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";

export const metadata = { title: "Order" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const order = await db.query.orders.findFirst({ where: eq(t.orders.id, Number((await params).id)), with: { items: true } });
  if (!order) notFound();
  return (
    <div className="space-y-6">
      <Link href="/admin/r/orders" className="inline-flex items-center gap-1 text-sm text-navy-700 hover:text-brand-700">
        <ArrowLeft className="size-4" /> Orders
      </Link>
      <PageHeader title={`Order ${order.orderNumber}`} subtitle={`Placed ${formatDate(order.createdAt, { dateStyle: "medium", timeStyle: "short" } as Intl.DateTimeFormatOptions)}`} actions={<StatusBadge status={order.status} />} />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Panel title="Items">
          <ul className="divide-y divide-line">
            {order.items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-3">
                <div className="relative size-14 overflow-hidden rounded-lg border border-line">
                  <AppImage src={i.image} alt={i.name} fill sizes="56px" className="object-contain" />
                </div>
                <span className="flex-1 font-medium text-navy-900">{i.name}</span>
                <span className="text-sm text-muted">{formatMoney(i.priceCents)} × {i.quantity}</span>
                <b className="w-24 text-right">{formatMoney(i.priceCents * i.quantity)}</b>
              </li>
            ))}
          </ul>
          <dl className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(order.subtotalCents)}</dd></div>
            <div className="flex justify-between"><dt>Shipping</dt><dd>{formatMoney(order.shippingCents)}</dd></div>
            <div className="flex justify-between"><dt>Tax</dt><dd>{formatMoney(order.taxCents)}</dd></div>
            <div className="flex justify-between border-t border-line pt-1 text-base font-bold"><dt>Total</dt><dd>{formatMoney(order.totalCents)}</dd></div>
          </dl>
        </Panel>
        <div className="space-y-6">
          <Panel title="Status">
            <OrderStatusForm id={order.id} status={order.status} />
            <p className="mt-3 text-xs text-muted">Payment: {order.paymentMethod} {order.paymentRef ? `· ${order.paymentRef}` : ""} {order.paidAt ? `· paid ${formatDate(order.paidAt)}` : ""}</p>
          </Panel>
          <Panel title="Customer">
            <p className="font-semibold text-navy-900">{order.customerName}</p>
            <p className="text-sm"><a href={`mailto:${order.email}`} className="link">{order.email}</a></p>
            {order.phone && <p className="text-sm">{order.phone}</p>}
            <p className="mt-3 text-sm text-navy-700">
              {order.address1}<br />{order.address2 && <>{order.address2}<br /></>}{order.city}, {order.state} {order.zip}<br />{order.country}
            </p>
            {order.notes && <p className="mt-3 rounded-lg bg-surface p-3 text-sm">{order.notes}</p>}
          </Panel>
        </div>
      </div>
    </div>
  );
}
