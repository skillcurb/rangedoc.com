"use client";
/**
 * Link to /search that adds the visitor's current location.
 * Used by "Where does it hurt?" and "Popular ways to find care":
 * the chosen item is pre-selected and results are shown near the visitor.
 */
import Link from "next/link";
import { useVisitorLocation } from "@/lib/client/location";

export function NearMeLink({ params, className, children }: { params: Record<string, string | undefined>; className?: string; children: React.ReactNode }) {
  const { location } = useVisitorLocation();
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  if (location) {
    if (location.citySlug) p.set("city", location.citySlug);
    p.set("lat", location.lat.toFixed(5));
    p.set("lng", location.lng.toFixed(5));
    p.set("loc", location.label);
  } else {
    p.set("near", "me"); // search page will try to detect the location
  }
  return (
    <Link href={`/search?${p.toString()}`} className={className}>
      {children}
    </Link>
  );
}
