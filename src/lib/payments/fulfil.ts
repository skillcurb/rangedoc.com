/**
 * What happens after a payment succeeds.
 *  - Plan order  → activate the plan on the provider profile
 *  - Product order → mark paid, email receipt
 */
import "server-only";
import { db, t, eq, and, isNotNull, sql } from "@/lib/db";
import { planExpiryFrom } from "@/lib/plans";
import { emailLayout, esc, sendMail } from "@/lib/email";
import { formatMoney } from "@/lib/utils";
import { getSettings } from "@/lib/settings";

export async function fulfilPlanOrder(orderNumber: string, paymentRef: string | null) {
  const order = await db.query.planOrders.findFirst({ where: eq(t.planOrders.orderNumber, orderNumber), with: { plan: true } });
  if (!order) return null;
  if (order.status === "PAID") return order; // already processed (page refresh)

  await db.update(t.planOrders).set({ status: "PAID", paidAt: new Date(), paymentRef }).where(eq(t.planOrders.id, order.id));

  if (order.providerId) {
    const provider = await db.query.providers.findFirst({ where: eq(t.providers.id, order.providerId) });
    // Extend from the current expiry if they renew early
    const start = provider?.planExpiresAt && provider.planExpiresAt > new Date() && provider.planId === order.planId ? provider.planExpiresAt : new Date();
    await db
      .update(t.providers)
      .set({ planId: order.planId, planExpiresAt: planExpiryFrom(order.plan.interval, start) })
      .where(eq(t.providers.id, order.providerId));
  }

  await sendMail({
    to: order.billingEmail,
    subject: `Your ${order.plan.name} plan is active`,
    html: await emailLayout(
      "Thank you for upgrading!",
      `<p>Hi ${esc(order.billingName)},</p><p>Your <b>${esc(order.plan.name)}</b> plan is now active. Order <b>${order.orderNumber}</b>, amount ${formatMoney(order.amountCents)}.</p>`,
    ),
  });
  return order;
}

export async function fulfilProductOrder(orderNumber: string, paymentRef: string | null) {
  const order = await db.query.orders.findFirst({ where: eq(t.orders.orderNumber, orderNumber), with: { items: true } });
  if (!order) return null;
  if (order.status !== "PENDING") return order;

  await db.update(t.orders).set({ status: "PAID", paidAt: new Date(), paymentRef }).where(eq(t.orders.id, order.id));
  // Reduce stock for tracked products
  for (const item of order.items) {
    if (item.productId) {
      await db
        .update(t.products)
        .set({ stock: sql`${t.products.stock} - ${item.quantity}` })
        .where(and(eq(t.products.id, item.productId), isNotNull(t.products.stock)));
    }
  }
  await sendOrderEmails(order.id);
  return order;
}

/** Customer receipt + admin notification */
export async function sendOrderEmails(orderId: number) {
  const order = await db.query.orders.findFirst({ where: eq(t.orders.id, orderId), with: { items: true } });
  if (!order) return;
  const s = await getSettings();
  const rows = order.items.map((i) => `<tr><td>${esc(i.name)} × ${i.quantity}</td><td style="text-align:right">${formatMoney(i.priceCents * i.quantity)}</td></tr>`).join("");
  const html = await emailLayout(
    `Order ${order.orderNumber}`,
    `<p>Hi ${esc(order.customerName)}, thanks for your order!</p>
     <table style="width:100%;border-collapse:collapse">${rows}
     <tr><td>Shipping</td><td style="text-align:right">${formatMoney(order.shippingCents)}</td></tr>
     <tr><td><b>Total</b></td><td style="text-align:right"><b>${formatMoney(order.totalCents)}</b></td></tr></table>
     <p>Status: ${order.status}</p>`,
  );
  await sendMail({ to: order.email, subject: `Your order ${order.orderNumber}`, html });
  if (s.email.adminNotifyEmail) await sendMail({ to: s.email.adminNotifyEmail, subject: `New order ${order.orderNumber}`, html });
}
