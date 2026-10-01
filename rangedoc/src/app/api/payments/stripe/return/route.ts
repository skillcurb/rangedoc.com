/**
 * GET /api/payments/stripe/return – Stripe sends the customer here after paying.
 * We double-check the payment with Stripe, then fulfil the order.
 */
import { NextResponse, type NextRequest } from "next/server";
import { confirmStripe } from "@/lib/payments/gateways";
import { fulfilPlanOrder, fulfilProductOrder } from "@/lib/payments/fulfil";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const kind = sp.get("kind") === "plan" ? "plan" : "order";
  const order = sp.get("order") ?? "";
  const sessionId = sp.get("session_id") ?? "";
  try {
    const ref = await confirmStripe(sessionId, order);
    if (!ref) return NextResponse.redirect(new URL(`/checkout/cancel?kind=${kind}&order=${order}&reason=unpaid`, request.url));
    if (kind === "plan") await fulfilPlanOrder(order, ref);
    else await fulfilProductOrder(order, ref);
    return NextResponse.redirect(new URL(`/checkout/success?kind=${kind}&order=${order}`, request.url));
  } catch (e) {
    console.error("[stripe:return]", e);
    return NextResponse.redirect(new URL(`/checkout/cancel?kind=${kind}&order=${order}&reason=error`, request.url));
  }
}
