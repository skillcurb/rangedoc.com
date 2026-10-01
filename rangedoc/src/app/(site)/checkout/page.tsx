/**
 * PRODUCT CHECKOUT  ( /checkout ) – guest checkout, no login needed.
 */
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getSettings, paymentMethodList } from "@/lib/settings";
import { ProductCheckoutForm } from "@/components/checkout/CheckoutForms";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("checkout", { title: "Checkout" });
}

export default async function CheckoutPage() {
  const s = await getSettings();
  const methods = paymentMethodList(s).map(({ id, label }) => ({ id, label }));
  return (
    <div className="bg-surface py-10">
      <div className="container-x">
        <h1 className="mb-6 text-3xl font-extrabold">Checkout</h1>
        <ProductCheckoutForm methods={methods} shipping={{ flat: s.products.shippingFlatCents, freeOver: s.products.freeShippingOverCents, taxPercent: Number(s.products.taxPercent) || 0 }} />
      </div>
    </div>
  );
}
