"use client";
/**
 * Small localStorage-backed stores used by the public site:
 *  - Cart (Recovery Marketplace – guest checkout, no login needed)
 *  - Saved providers (the "Save" button on profiles)
 *  - Product wishlist (heart icon)
 */
import { useSyncExternalStore } from "react";

function createStore<T>(key: string, initial: T) {
  const listeners = new Set<() => void>();
  let cache: T | undefined;
  const serverSnapshot = initial;

  const get = (): T => {
    if (typeof window === "undefined") return initial;
    if (cache !== undefined) return cache;
    try {
      const raw = localStorage.getItem(key);
      cache = raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      cache = initial;
    }
    return cache;
  };
  const set = (value: T) => {
    cache = value;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l());
  };
  const subscribe = (cb: () => void) => {
    listeners.add(cb);
    // Keep multiple tabs in sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        cache = undefined;
        cb();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(cb);
      window.removeEventListener("storage", onStorage);
    };
  };
  const use = () => useSyncExternalStore(subscribe, get, () => serverSnapshot);
  return { get, set, use };
}

// ───────────────────────────── Cart ─────────────────────────────

export type CartItem = { productId: number; slug: string; name: string; image: string | null; priceCents: number; quantity: number };

const cartStore = createStore<CartItem[]>("rd_cart", []);

export function useCart() {
  const items = cartStore.use();
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const subtotal = items.reduce((n, i) => n + i.priceCents * i.quantity, 0);
  return {
    items,
    count,
    subtotal,
    add(item: Omit<CartItem, "quantity">, qty = 1) {
      const list = cartStore.get();
      const existing = list.find((i) => i.productId === item.productId);
      cartStore.set(existing ? list.map((i) => (i.productId === item.productId ? { ...i, quantity: i.quantity + qty } : i)) : [...list, { ...item, quantity: qty }]);
    },
    update(productId: number, quantity: number) {
      cartStore.set(cartStore.get().flatMap((i) => (i.productId === productId ? (quantity > 0 ? [{ ...i, quantity }] : []) : [i])));
    },
    remove(productId: number) {
      cartStore.set(cartStore.get().filter((i) => i.productId !== productId));
    },
    clear() {
      cartStore.set([]);
    },
  };
}

// ───────────────────────── Saved providers ──────────────────────

export type SavedProvider = { id: number; slug: string; name: string; photo: string | null; typeLabel: string; city: string };
const savedStore = createStore<SavedProvider[]>("rd_saved", []);

export function useSavedProviders() {
  const items = savedStore.use();
  return {
    items,
    isSaved: (id: number) => items.some((i) => i.id === id),
    toggle(p: SavedProvider) {
      const list = savedStore.get();
      const exists = list.some((i) => i.id === p.id);
      savedStore.set(exists ? list.filter((i) => i.id !== p.id) : [p, ...list]);
      return !exists;
    },
    remove(id: number) {
      savedStore.set(savedStore.get().filter((i) => i.id !== id));
    },
  };
}

// ─────────────────────────── Wishlist ───────────────────────────

const wishStore = createStore<number[]>("rd_wishlist", []);
export function useWishlist() {
  const ids = wishStore.use();
  return {
    ids,
    has: (id: number) => ids.includes(id),
    toggle(id: number) {
      const list = wishStore.get();
      wishStore.set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
    },
  };
}
