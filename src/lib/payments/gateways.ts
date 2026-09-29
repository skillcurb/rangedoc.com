/**
 * Payment gateways: Stripe (cards – Visa, Mastercard, Amex…) and PayPal.
 * ------------------------------------------------------------------
 * Both use a hosted/redirect flow, so card numbers never touch our server:
 *   1. createCheckout() → returns a URL on Stripe / PayPal
 *   2. The customer pays there and is sent back to our return URL
 *   3. confirm*() verifies the payment with the gateway, then we mark the
 *      order as PAID (see src/app/api/payments/…)
 *
 * Keys are stored in Admin → Settings → Payments.
 */
import "server-only";
import Stripe from "stripe";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/utils";

export type PaymentKind = "plan" | "order";

export type CheckoutInput = {
  kind: PaymentKind;
  orderNumber: string;
  description: string;
  amountCents: number;
  email: string;
  items?: { name: string; amountCents: number; quantity: number }[];
};

// ───────────────────────────── Stripe ─────────────────────────────

async function stripeClient() {
  const s = await getSettings();
  if (!s.payments.stripe.secretKey) throw new Error("Stripe is not configured.");
  return new Stripe(s.payments.stripe.secretKey);
}

export async function createStripeCheckout(input: CheckoutInput) {
  const s = await getSettings();
  const stripe = await stripeClient();
  const currency = s.payments.currency.toLowerCase();
  const lineItems = (input.items?.length ? input.items : [{ name: input.description, amountCents: input.amountCents, quantity: 1 }]).map((i) => ({
    quantity: i.quantity,
    price_data: { currency, unit_amount: i.amountCents, product_data: { name: i.name } },
  }));
  // Products checkout may include shipping/tax as an extra line
  const itemsTotal = lineItems.reduce((sum, l) => sum + l.price_data.unit_amount * l.quantity, 0);
  if (input.amountCents > itemsTotal) {
    lineItems.push({ quantity: 1, price_data: { currency, unit_amount: input.amountCents - itemsTotal, product_data: { name: "Shipping & tax" } } });
  }
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.email,
    line_items: lineItems,
    metadata: { kind: input.kind, orderNumber: input.orderNumber },
    success_url: siteUrl(`/api/payments/stripe/return?kind=${input.kind}&order=${input.orderNumber}&session_id={CHECKOUT_SESSION_ID}`),
    cancel_url: siteUrl(`/checkout/cancel?kind=${input.kind}&order=${input.orderNumber}`),
  });
  return { url: session.url!, ref: session.id };
}

/** Returns true when the Stripe session was paid */
export async function confirmStripe(sessionId: string, orderNumber: string) {
  const stripe = await stripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return session.payment_status === "paid" && session.metadata?.orderNumber === orderNumber ? session.id : null;
}

// ───────────────────────────── PayPal ─────────────────────────────

async function paypalBase() {
  const s = await getSettings();
  const p = s.payments.paypal;
  if (!p.clientId || !p.clientSecret) throw new Error("PayPal is not configured.");
  const api = p.mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const tokenRes = await fetch(`${api}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${p.clientId}:${p.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!tokenRes.ok) throw new Error("PayPal authentication failed.");
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  return { api, token: access_token, currency: s.payments.currency };
}

export async function createPaypalCheckout(input: CheckoutInput) {
  const { api, token, currency } = await paypalBase();
  const res = await fetch(`${api}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.orderNumber,
          custom_id: `${input.kind}:${input.orderNumber}`,
          description: input.description.slice(0, 127),
          amount: { currency_code: currency, value: (input.amountCents / 100).toFixed(2) },
        },
      ],
      application_context: {
        user_action: "PAY_NOW",
        return_url: siteUrl(`/api/payments/paypal/return?kind=${input.kind}&order=${input.orderNumber}`),
        cancel_url: siteUrl(`/checkout/cancel?kind=${input.kind}&order=${input.orderNumber}`),
      },
    }),
  });
  const data = (await res.json()) as { id: string; links?: { rel: string; href: string }[] };
  const approve = data.links?.find((l) => l.rel === "approve" || l.rel === "payer-action");
  if (!res.ok || !approve) throw new Error("Could not start PayPal checkout.");
  return { url: approve.href, ref: data.id };
}

/** Capture an approved PayPal order. Returns the capture id when completed. */
export async function capturePaypal(paypalOrderId: string) {
  const { api, token } = await paypalBase();
  const res = await fetch(`${api}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const data = (await res.json()) as { status?: string; purchase_units?: { payments?: { captures?: { id: string }[] } }[] };
  if (data.status !== "COMPLETED") return null;
  return data.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? paypalOrderId;
}

/** Start checkout with the chosen method. "manual" = pay later / invoice. */
export async function startPayment(method: string, input: CheckoutInput) {
  if (method === "stripe") return createStripeCheckout(input);
  if (method === "paypal") return createPaypalCheckout(input);
  return null; // manual – no redirect
}
