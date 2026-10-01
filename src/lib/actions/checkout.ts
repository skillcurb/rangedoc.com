"use server";
/**
 * Checkout server actions.
 *  - checkoutPlan:     provider buys / upgrades a plan (Pro, Featured…)
 *  - checkoutProducts: visitor buys marketplace products (guest checkout,
 *                      no account needed)
 *
 * Prices are ALWAYS recalculated on the server from the database –
 * never trust amounts sent by the browser.
 */
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, t, eq, and, inArray, insertId } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings, paymentMethodList } from "@/lib/settings";
import { startPayment } from "@/lib/payments/gateways";
import { sendOrderEmails } from "@/lib/payments/fulfil";
import { emailLayout, esc, sendMail } from "@/lib/email";
import { formatMoney, orderNumber } from "@/lib/utils";

export type CheckoutState = { error?: string } | null;

async function assertMethodEnabled(method: string) {
  const s = await getSettings();
  const enabled = paymentMethodList(s).map((m) => m.id as string);
  if (!enabled.includes(method)) throw new Error("This payment method is not available.");
}

// ───────────────────────────── Plans ─────────────────────────────

const planSchema = z.object({
  planSlug: z.string().min(1),
  billingName: z.string().trim().min(2, "Enter the billing name").max(120),
  billingEmail: z.email("Enter a valid billing email"),
  billingPhone: z.string().max(40).optional(),
  billingAddress: z.string().max(300).optional(),
  paymentMethod: z.string().min(1, "Choose a payment method"),
});

export async function checkoutPlan(_: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "PROVIDER" || !user.providerId) return { error: "Please log in to your provider account first." };
  const parsed = planSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const plan = await db.query.plans.findFirst({ where: eq(t.plans.slug, d.planSlug) });
  if (!plan || !plan.active || plan.isFree) return { error: "Plan not available." };

  let paymentUrl: string | null = null;
  const number = orderNumber("PL");
  try {
    await assertMethodEnabled(d.paymentMethod);
    await db.insert(t.planOrders).values({
      orderNumber: number, providerId: user.providerId, userId: user.id, planId: plan.id, amountCents: plan.priceCents,
      currency: (await getSettings()).payments.currency, paymentMethod: d.paymentMethod, billingName: d.billingName,
      billingEmail: d.billingEmail, billingPhone: d.billingPhone || null, billingAddress: d.billingAddress || null,
    });
    const session = await startPayment(d.paymentMethod, { kind: "plan", orderNumber: number, description: `${plan.name} plan`, amountCents: plan.priceCents, email: d.billingEmail });
    if (session) {
      await db.update(t.planOrders).set({ paymentRef: session.ref }).where(eq(t.planOrders.orderNumber, number));
      paymentUrl = session.url;
    } else {
      // Manual / invoice: admin marks the order paid, which activates the plan
      const s = await getSettings();
      if (s.email.adminNotifyEmail) {
        await sendMail({ to: s.email.adminNotifyEmail, subject: `Plan order ${number} awaiting payment`, html: await emailLayout("Manual plan order", `<p>${esc(d.billingName)} ordered ${esc(plan.name)} (${formatMoney(plan.priceCents)}). Mark it paid in Admin → Plan orders once payment is received.</p>`) });
      }
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Payment could not be started." };
  }
  redirect(paymentUrl ?? `/checkout/success?kind=plan&order=${number}`);
}

// ───────────────────────────── Products ─────────────────────────────

const productSchema = z.object({
  items: z.string().min(2, "Your cart is empty"),
  customerName: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.email("Enter a valid email"),
  phone: z.string().max(40).optional(),
  address1: z.string().trim().min(3, "Enter your street address").max(200),
  address2: z.string().max(200).optional(),
  city: z.string().trim().min(2, "Enter your city").max(100),
  state: z.string().trim().min(2, "Enter your state").max(60),
  zip: z.string().trim().min(3, "Enter your ZIP code").max(20),
  country: z.string().max(60).optional(),
  notes: z.string().max(1000).optional(),
  paymentMethod: z.string().min(1, "Choose a payment method"),
});

export async function checkoutProducts(_: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  let cart: { productId: number; quantity: number }[];
  try {
    cart = z.array(z.object({ productId: z.number().int(), quantity: z.number().int().min(1).max(99) })).min(1).parse(JSON.parse(d.items));
  } catch {
    return { error: "Your cart is empty or invalid." };
  }

  const products = await db.query.products.findMany({ where: and(inArray(t.products.id, cart.map((c) => c.productId)), eq(t.products.active, true)) });
  const lines = cart.flatMap((c) => {
    const p = products.find((x) => x.id === c.productId);
    return p ? [{ product: p, quantity: c.quantity }] : [];
  });
  if (!lines.length) return { error: "The products in your cart are no longer available." };
  for (const l of lines) if (l.product.stock != null && l.product.stock < l.quantity) return { error: `Only ${l.product.stock} left of "${l.product.name}".` };

  const s = await getSettings();
  const subtotal = lines.reduce((sum, l) => sum + l.product.priceCents * l.quantity, 0);
  const shipping = subtotal >= s.products.freeShippingOverCents ? 0 : s.products.shippingFlatCents;
  const tax = Math.round((subtotal * (Number(s.products.taxPercent) || 0)) / 100);
  const total = subtotal + shipping + tax;
  const number = orderNumber("OR");

  let paymentUrl: string | null = null;
  try {
    await assertMethodEnabled(d.paymentMethod);
    // Order + its line items are written in one transaction (all or nothing)
    const orderId = await db.transaction(async (tx) => {
      const id = await insertId(
        tx.insert(t.orders).values({
          orderNumber: number, customerName: d.customerName, email: d.email, phone: d.phone || null, address1: d.address1, address2: d.address2 || null,
          city: d.city, state: d.state, zip: d.zip, country: d.country || "US", notes: d.notes || null, subtotalCents: subtotal, shippingCents: shipping,
          taxCents: tax, totalCents: total, currency: s.payments.currency, paymentMethod: d.paymentMethod,
        }),
      );
      // `lines` is never empty here (checked above)
      await tx.insert(t.orderItems).values(lines.map((l) => ({ orderId: id, productId: l.product.id, name: l.product.name, image: l.product.image, priceCents: l.product.priceCents, quantity: l.quantity })));
      return id;
    });
    const session = await startPayment(d.paymentMethod, {
      kind: "order", orderNumber: number, description: `Order ${number}`, amountCents: total, email: d.email,
      items: lines.map((l) => ({ name: l.product.name, amountCents: l.product.priceCents, quantity: l.quantity })),
    });
    if (session) {
      await db.update(t.orders).set({ paymentRef: session.ref }).where(eq(t.orders.id, orderId));
      paymentUrl = session.url;
    } else {
      await sendOrderEmails(orderId); // manual payment – send order confirmation now
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Payment could not be started." };
  }
  redirect(paymentUrl ?? `/checkout/success?kind=order&order=${number}`);
}
