"use client";
/**
 * Checkout forms (client side).
 *  - <PlanCheckoutForm>    billing details + payment method for a plan
 *  - <ProductCheckoutForm> shipping details + payment method, cart from localStorage
 *  - <ClearCartOnMount>    empties the cart after a successful order
 */
import { useActionState, useEffect } from "react";
import Link from "next/link";
import { CreditCard, Lock, ShoppingCart } from "lucide-react";
import toast from "react-hot-toast";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { AppImage } from "@/components/ui/AppImage";
import { EmptyState } from "@/components/ui/Misc";
import { checkoutPlan, checkoutProducts } from "@/lib/actions/checkout";
import { useCart } from "@/lib/client/stores";
import { formatMoney } from "@/lib/utils";

type Method = { id: string; label: string };

function PaymentMethods({ methods }: { methods: Method[] }) {
  if (!methods.length) return <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">No payment methods are enabled yet. Please contact us.</p>;
  return (
    <fieldset className="space-y-2">
      <legend className="label">Payment method</legend>
      {methods.map((m, i) => (
        <label key={m.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-line p-3 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50/60">
          <input type="radio" name="paymentMethod" value={m.id} defaultChecked={i === 0} className="accent-brand-600" />
          <span className="flex-1 text-sm font-medium text-navy-900">{m.label}</span>
          {m.id === "stripe" && (
            <span className="flex gap-1 text-[10px] font-bold">
              <span className="rounded bg-[#1a1f71] px-1.5 py-0.5 text-white">VISA</span>
              <span className="rounded bg-[#eb001b] px-1.5 py-0.5 text-white">MC</span>
              <span className="rounded bg-[#2e77bc] px-1.5 py-0.5 text-white">AMEX</span>
            </span>
          )}
          {m.id === "paypal" && <span className="rounded bg-[#ffc439] px-1.5 py-0.5 text-[10px] font-bold text-[#003087]">PayPal</span>}
        </label>
      ))}
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <Lock className="size-3.5" /> Card and PayPal payments are processed securely by Stripe / PayPal. We never see your card number.
      </p>
    </fieldset>
  );
}

export function PlanCheckoutForm({ planSlug, methods, defaults }: { planSlug: string; methods: Method[]; defaults: { name: string; email: string } }) {
  const [state, action] = useActionState(checkoutPlan, null);
  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="planSlug" value={planSlug} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="bn">Billing name</label>
          <input id="bn" name="billingName" required defaultValue={defaults.name} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="be">Billing email</label>
          <input id="be" name="billingEmail" type="email" required defaultValue={defaults.email} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="bp">Phone (optional)</label>
          <input id="bp" name="billingPhone" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="ba">Billing address (optional)</label>
          <input id="ba" name="billingAddress" className="input" />
        </div>
      </div>
      <PaymentMethods methods={methods} />
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <SubmitButton className="w-full py-3" disabled={!methods.length} pendingText="Starting secure checkout…">
        <CreditCard className="size-5" /> Continue to payment
      </SubmitButton>
    </form>
  );
}

export function ProductCheckoutForm({ methods, shipping }: { methods: Method[]; shipping: { flat: number; freeOver: number; taxPercent: number } }) {
  const { items, subtotal } = useCart();
  const [state, action] = useActionState(checkoutProducts, null);
  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  if (!items.length) {
    return <EmptyState icon={<ShoppingCart className="size-10" />} title="Your cart is empty" text="Add some recovery tools first." action={<Link href="/products" className="btn-primary">Browse products</Link>} />;
  }
  const ship = subtotal >= shipping.freeOver ? 0 : shipping.flat;
  const tax = Math.round((subtotal * shipping.taxPercent) / 100);

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <input type="hidden" name="items" value={JSON.stringify(items.map((i) => ({ productId: i.productId, quantity: i.quantity })))} />
      <div className="card space-y-5 p-6">
        <h2 className="text-xl font-bold">Contact &amp; shipping</h2>
        <p className="-mt-3 text-sm text-muted">No account needed.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="customerName" required placeholder="Full name *" className="input sm:col-span-2" autoComplete="name" />
          <input name="email" type="email" required placeholder="Email *" className="input" autoComplete="email" />
          <input name="phone" type="tel" placeholder="Phone" className="input" autoComplete="tel" />
          <input name="address1" required placeholder="Street address *" className="input sm:col-span-2" autoComplete="address-line1" />
          <input name="address2" placeholder="Apartment, suite (optional)" className="input sm:col-span-2" autoComplete="address-line2" />
          <input name="city" required placeholder="City *" className="input" autoComplete="address-level2" />
          <div className="grid grid-cols-2 gap-3">
            <input name="state" required placeholder="State *" className="input" autoComplete="address-level1" />
            <input name="zip" required placeholder="ZIP *" className="input" autoComplete="postal-code" />
          </div>
          <input type="hidden" name="country" value="US" />
          <textarea name="notes" rows={2} placeholder="Order notes (optional)" className="input sm:col-span-2" />
        </div>
        <PaymentMethods methods={methods} />
        {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      </div>

      <aside className="card h-fit space-y-4 p-6 lg:sticky lg:top-20">
        <h2 className="text-lg font-bold">Order summary</h2>
        <ul className="divide-y divide-line">
          {items.map((i) => (
            <li key={i.productId} className="flex items-center gap-3 py-3">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-line">
                <AppImage src={i.image} alt={i.name} fill sizes="56px" className="object-contain" />
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-medium text-navy-900">{i.name}</p>
                <p className="text-muted">Qty {i.quantity}</p>
              </div>
              <p className="text-sm font-semibold">{formatMoney(i.priceCents * i.quantity)}</p>
            </li>
          ))}
        </ul>
        <dl className="space-y-1.5 border-t border-line pt-3 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Shipping</dt><dd>{ship ? formatMoney(ship) : "Free"}</dd></div>
          {tax > 0 && <div className="flex justify-between"><dt>Tax</dt><dd>{formatMoney(tax)}</dd></div>}
          <div className="flex justify-between border-t border-line pt-2 text-base font-bold text-navy-900"><dt>Total</dt><dd>{formatMoney(subtotal + ship + tax)}</dd></div>
        </dl>
        <SubmitButton className="w-full py-3" disabled={!methods.length} pendingText="Placing order…">
          <Lock className="size-4" /> Place order
        </SubmitButton>
      </aside>
    </form>
  );
}

export function ClearCartOnMount() {
  const { clear, count } = useCart();
  useEffect(() => {
    if (count) clear();
  }, [clear, count]);
  return null;
}
