/**
 * What happens after a payment succeeds.
 *  - Plan order  → activate the plan on the provider profile
 *  - Product order → mark paid, email receipt
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { planExpiryFrom } from "@/lib/plans";
import { emailLayout, esc, sendMail } from "@/lib/email";
import { formatMoney } from "@/lib/utils";
import { getSettings } from "@/lib/settings";

export async function fulfilPlanOrder(orderNumber: string, paymentRef: string | null) {
  const order = await prisma.planOrder.findUnique({ where: { orderNumber }, include: { plan: true } });
  if (!order) return null;
  if (order.status === "PAID") return order; // already processed (page refresh)

  await prisma.planOrder.update({ where: { id: order.id }, data: { status: "PAID", paidAt: new Date(), paymentRef } });

  if (order.providerId) {
    const provider = await prisma.provider.findUnique({ where: { id: order.providerId } });
    // Extend from the current expiry if they renew early
    const start = provider?.planExpiresAt && provider.planExpiresAt > new Date() && provider.planId === order.planId ? provider.planExpiresAt : new Date();
    await prisma.provider.update({
      where: { id: order.providerId },
      data: { planId: order.planId, planExpiresAt: planExpiryFrom(order.plan.interval, start) },
    });
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
  const order = await prisma.order.findUnique({ where: { orderNumber }, include: { items: true } });
  if (!order) return null;
  if (order.status !== "PENDING") return order;

  await prisma.order.update({ where: { id: order.id }, data: { status: "PAID", paidAt: new Date(), paymentRef } });
  // Reduce stock for tracked products
  for (const item of order.items) {
    if (item.productId) {
      await prisma.product.updateMany({ where: { id: item.productId, stock: { not: null } }, data: { stock: { decrement: item.quantity } } });
    }
  }
  await sendOrderEmails(order.id);
  return order;
}

/** Customer receipt + admin notification */
export async function sendOrderEmails(orderId: number) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
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
