/**
 * GET /api/payments/paypal/return – PayPal sends the buyer here after approval
 * (?token=<PayPal order id>). We capture the payment, then fulfil the order.
 */
import { NextResponse, type NextRequest } from "next/server";
import { capturePaypal } from "@/lib/payments/gateways";
import { fulfilPlanOrder, fulfilProductOrder } from "@/lib/payments/fulfil";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const kind = sp.get("kind") === "plan" ? "plan" : "order";
  const order = sp.get("order") ?? "";
  const token = sp.get("token") ?? "";
  try {
    const ref = await capturePaypal(token);
    if (!ref) return NextResponse.redirect(new URL(`/checkout/cancel?kind=${kind}&order=${order}&reason=unpaid`, request.url));
    if (kind === "plan") await fulfilPlanOrder(order, ref);
    else await fulfilProductOrder(order, ref);
    return NextResponse.redirect(new URL(`/checkout/success?kind=${kind}&order=${order}`, request.url));
  } catch (e) {
    console.error("[paypal:return]", e);
    return NextResponse.redirect(new URL(`/checkout/cancel?kind=${kind}&order=${order}&reason=error`, request.url));
  }
}
