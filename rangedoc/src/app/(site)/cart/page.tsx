/**
 * CART  ( /cart ) – items are stored in the browser (no login needed).
 */
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { CartView } from "@/components/products/CartView";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("cart", { title: "Your Cart" });
}

export default async function CartPage() {
  const s = await getSettings();
  return (
    <div className="bg-surface py-10">
      <div className="container-x">
        <h1 className="mb-6 text-3xl font-extrabold">Your Cart</h1>
        <CartView freeOver={s.products.freeShippingOverCents} flat={s.products.shippingFlatCents} />
      </div>
    </div>
  );
}
