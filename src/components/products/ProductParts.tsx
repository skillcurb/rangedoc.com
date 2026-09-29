"use client";
/**
 * Marketplace client components: product card, add-to-cart, cart view,
 * and the filter sidebar (updates the URL so filters are shareable).
 */
import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ChevronDown, Heart, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { AppImage } from "@/components/ui/AppImage";
import { EmptyState } from "@/components/ui/Misc";
import { useCart, useWishlist } from "@/lib/client/stores";
import { track } from "@/lib/client/track";
import { cn, formatMoney } from "@/lib/utils";

export type ProductCardData = {
  id: number;
  slug: string;
  name: string;
  shortDescription: string | null;
  priceCents: number;
  compareAtCents: number | null;
  image: string | null;
  category: string | null;
  inStock: boolean;
};

export function ProductCard({ p }: { p: ProductCardData }) {
  const wish = useWishlist();
  return (
    <article className="card card-hover group flex flex-col p-3">
      <div className="flex items-start justify-between">
        {p.category ? <span className="badge bg-navy-50 text-navy-700">{p.category}</span> : <span />}
        <button type="button" onClick={() => wish.toggle(p.id)} aria-label={wish.has(p.id) ? "Remove from wishlist" : "Add to wishlist"}>
          <Heart className={cn("size-5 text-navy-400", wish.has(p.id) && "fill-red-500 text-red-500")} />
        </button>
      </div>
      <Link href={`/products/${p.slug}`} className="relative my-2 aspect-square overflow-hidden rounded-lg">
        <AppImage src={p.image} alt={p.name} fill sizes="(max-width:640px) 50vw, 220px" className="object-contain transition duration-300 group-hover:scale-105" />
      </Link>
      <h3 className="text-sm font-bold text-navy-900">
        <Link href={`/products/${p.slug}`} className="hover:text-brand-700">
          {p.name}
        </Link>
      </h3>
      {p.shortDescription && <p className="mt-1 line-clamp-2 text-xs text-muted">{p.shortDescription}</p>}
      <p className="mt-2 font-bold text-navy-900">
        {formatMoney(p.priceCents)}
        {p.compareAtCents && p.compareAtCents > p.priceCents && <span className="ml-2 text-xs font-normal text-muted line-through">{formatMoney(p.compareAtCents)}</span>}
      </p>
      <div className="mt-auto pt-3">
        <AddToCartButton product={p} className="w-full" />
      </div>
    </article>
  );
}

export function AddToCartButton({ product, className, qty = 1, big }: { product: ProductCardData; className?: string; qty?: number; big?: boolean }) {
  const cart = useCart();
  if (!product.inStock) return <button disabled className={cn("btn-light", className)}>Out of stock</button>;
  return (
    <button
      type="button"
      className={cn(big ? "btn-primary btn-lg" : "btn-outline", className)}
      onClick={() => {
        cart.add({ productId: product.id, slug: product.slug, name: product.name, image: product.image, priceCents: product.priceCents }, qty);
        track("ADD_TO_CART", { meta: { productId: product.id } });
        toast.success(
          (t) => (
            <span className="flex items-center gap-3">
              Added to cart
              <Link href="/cart" onClick={() => toast.dismiss(t.id)} className="font-semibold text-brand-700 underline">
                View cart
              </Link>
            </span>
          ),
        );
      }}
    >
      <ShoppingCart className="size-4" /> Add to Cart
    </button>
  );
}

export function QuantityAddToCart({ product }: { product: ProductCardData }) {
  const [qty, setQty] = useState(1);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center rounded-lg border border-line">
        <button type="button" className="p-3" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease quantity">
          <Minus className="size-4" />
        </button>
        <span className="w-10 text-center font-semibold">{qty}</span>
        <button type="button" className="p-3" onClick={() => setQty(Math.min(99, qty + 1))} aria-label="Increase quantity">
          <Plus className="size-4" />
        </button>
      </div>
      <AddToCartButton product={product} qty={qty} big />
    </div>
  );
}

export function CartView({ freeOver, flat }: { freeOver: number; flat: number }) {
  const { items, subtotal, update, remove } = useCart();
  if (!items.length) {
    return <EmptyState icon={<ShoppingCart className="size-10" />} title="Your cart is empty" text="Browse recovery tools curated by licensed providers." action={<Link href="/products" className="btn-primary">Shop products</Link>} />;
  }
  const shipping = subtotal >= freeOver ? 0 : flat;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <ul className="card divide-y divide-line">
        {items.map((i) => (
          <li key={i.productId} className="flex items-center gap-4 p-4">
            <Link href={`/products/${i.slug}`} className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-line">
              <AppImage src={i.image} alt={i.name} fill sizes="80px" className="object-contain" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/products/${i.slug}`} className="font-semibold text-navy-900 hover:text-brand-700">
                {i.name}
              </Link>
              <p className="text-sm text-muted">{formatMoney(i.priceCents)} each</p>
            </div>
            <div className="flex items-center rounded-lg border border-line">
              <button type="button" className="p-2" onClick={() => update(i.productId, i.quantity - 1)} aria-label="Decrease">
                <Minus className="size-4" />
              </button>
              <span className="w-8 text-center text-sm font-semibold">{i.quantity}</span>
              <button type="button" className="p-2" onClick={() => update(i.productId, i.quantity + 1)} aria-label="Increase">
                <Plus className="size-4" />
              </button>
            </div>
            <p className="w-20 text-right font-semibold">{formatMoney(i.priceCents * i.quantity)}</p>
            <button type="button" onClick={() => remove(i.productId)} className="text-muted hover:text-red-600" aria-label="Remove">
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <aside className="card h-fit space-y-3 p-5">
        <div className="flex justify-between text-sm"><span>Subtotal</span><b>{formatMoney(subtotal)}</b></div>
        <div className="flex justify-between text-sm"><span>Shipping</span><span>{shipping ? formatMoney(shipping) : "Free"}</span></div>
        {shipping > 0 && <p className="text-xs text-brand-700">Add {formatMoney(freeOver - subtotal)} more for free shipping.</p>}
        <div className="flex justify-between border-t border-line pt-3 text-lg font-bold text-navy-900"><span>Total</span><span>{formatMoney(subtotal + shipping)}</span></div>
        <Link href="/checkout" className="btn-primary w-full py-3">
          Checkout <ArrowRight className="size-4" />
        </Link>
        <p className="text-center text-xs text-muted">Guest checkout — no account needed</p>
      </aside>
    </div>
  );
}

// ───────────────────────── Filters ─────────────────────────

export type ProductFacets = {
  categories: { slug: string; name: string }[];
  types: string[];
  brands: string[];
  useCases: string[];
};

const PRICE_RANGES = [
  { v: "", label: "All Prices" },
  { v: "0-2500", label: "Under $25" },
  { v: "2500-5000", label: "$25 – $50" },
  { v: "5000-10000", label: "$50 – $100" },
  { v: "10000-", label: "Over $100" },
];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-line py-3">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-sm font-bold text-navy-900">
        {title} <ChevronDown className={cn("size-4 transition", !open && "-rotate-90")} />
      </button>
      {open && <div className="mt-2 space-y-1.5">{children}</div>}
    </div>
  );
}

export function ProductFilters({ facets }: { facets: ProductFacets }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const list = (k: string) => (params.get(k) ?? "").split(",").filter(Boolean);
  const set = (k: string, v: string | null) => {
    const p = new URLSearchParams(params.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    p.delete("page");
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };
  const toggle = (k: string, v: string) => {
    const cur = list(k);
    set(k, (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]).join(",") || null);
  };
  const box = (k: string, v: string, label: string) => (
    <label key={v} className="flex cursor-pointer items-center gap-2 text-sm text-navy-800">
      <input type="checkbox" className="checkbox" checked={list(k).includes(v)} onChange={() => toggle(k, v)} /> {label}
    </label>
  );
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Filters</h2>
        <button type="button" onClick={() => router.replace(pathname, { scroll: false })} className="text-sm text-navy-600 hover:underline">
          Clear all
        </button>
      </div>
      <Group title="Pain Area">{facets.categories.map((c) => box("category", c.slug, c.name))}</Group>
      <Group title="Product Type">{facets.types.map((t) => box("type", t, t))}</Group>
      <Group title="Price Range">
        {PRICE_RANGES.map((r) => (
          <label key={r.v} className="flex cursor-pointer items-center gap-2 text-sm text-navy-800">
            <input type="radio" name="price" className="accent-brand-600" checked={(params.get("price") ?? "") === r.v} onChange={() => set("price", r.v || null)} /> {r.label}
          </label>
        ))}
      </Group>
      <Group title="Brand">
        <select className="input py-2" value={params.get("brand") ?? ""} onChange={(e) => set("brand", e.target.value || null)} aria-label="Brand">
          <option value="">All Brands</option>
          {facets.brands.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </Group>
      <Group title="Use Case">{facets.useCases.map((u) => box("use", u, u))}</Group>
    </div>
  );
}

export function SortSelect() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  return (
    <select
      className="input w-auto py-2"
      value={params.get("sort") ?? "popular"}
      aria-label="Sort products"
      onChange={(e) => {
        const p = new URLSearchParams(params.toString());
        p.set("sort", e.target.value);
        router.replace(`${pathname}?${p.toString()}`, { scroll: false });
      }}
    >
      <option value="popular">Most Popular</option>
      <option value="price-asc">Price: Low to High</option>
      <option value="price-desc">Price: High to Low</option>
      <option value="newest">Newest</option>
    </select>
  );
}
