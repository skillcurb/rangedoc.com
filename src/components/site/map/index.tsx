"use client";
/**
 * Browser-only wrappers for Leaflet maps (Leaflet touches `window`,
 * so it can't be rendered on the server).
 */
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";

export const ProviderMapLazy = dynamic(() => import("@/components/site/map/ProviderMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

export const LocationPickerLazy = dynamic(() => import("@/components/site/map/LocationPicker"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});
