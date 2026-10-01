"use client";
/**
 * Visitor location store (browser only).
 * ------------------------------------------------------------------
 * Remembers the visitor's location in localStorage so the home page,
 * search page, providers page and profile pages all agree on
 * "where the visitor is" and can show distances.
 *
 *   const { location, detect, setLocation } = useVisitorLocation();
 */
import { useCallback, useSyncExternalStore } from "react";

export type VisitorLocation = {
  label: string; // "Austin, TX"
  citySlug: string | null; // nearest city in our directory
  lat: number;
  lng: number;
  source: "gps" | "manual";
};

const KEY = "rd_loc";
const listeners = new Set<() => void>();
let cache: VisitorLocation | null | undefined;

export function getStoredLocation(): VisitorLocation | null {
  if (typeof window === "undefined") return null;
  if (cache !== undefined) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as VisitorLocation) : null;
  } catch {
    cache = null;
  }
  return cache;
}

export function saveLocation(loc: VisitorLocation | null) {
  cache = loc;
  try {
    if (loc) localStorage.setItem(KEY, JSON.stringify(loc));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage may be blocked (private mode) – keep in memory only */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Ask the browser for GPS position, then look up the nearest city */
export function detectLocation(): Promise<VisitorLocation | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const res = await fetch(`/api/geo/nearest?lat=${lat}&lng=${lng}`);
          const data = (await res.json()) as { label?: string; citySlug?: string | null };
          const loc: VisitorLocation = { label: data.label || "Current location", citySlug: data.citySlug ?? null, lat, lng, source: "gps" };
          saveLocation(loc);
          resolve(loc);
        } catch {
          const loc: VisitorLocation = { label: "Current location", citySlug: null, lat, lng, source: "gps" };
          saveLocation(loc);
          resolve(loc);
        }
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

export function useVisitorLocation() {
  const location = useSyncExternalStore(subscribe, getStoredLocation, () => null);
  const detect = useCallback(() => detectLocation(), []);
  return { location, detect, setLocation: saveLocation };
}
