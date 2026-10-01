"use client";
/** Grid of saved providers (from localStorage). */
import Link from "next/link";
import { Heart, MapPin, Trash2 } from "lucide-react";
import { AppImage } from "@/components/ui/AppImage";
import { EmptyState } from "@/components/ui/Misc";
import { useSavedProviders } from "@/lib/client/stores";

export function SavedList() {
  const { items, remove } = useSavedProviders();
  if (!items.length) return <EmptyState icon={<Heart className="size-10" />} title="No saved providers yet" text='Tap "Save" on a provider profile to keep it here.' action={<Link href="/search" className="btn-primary">Find providers</Link>} />;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => (
        <div key={p.id} className="card flex gap-4 p-4">
          <Link href={`/provider/${p.slug}`} className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-navy-50">
            <AppImage src={p.photo} alt={p.name} fill sizes="80px" className="object-cover" />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/provider/${p.slug}`} className="font-bold text-navy-900 hover:text-brand-700">{p.name}</Link>
            <p className="text-sm text-muted">{p.typeLabel}</p>
            {p.city && <p className="flex items-center gap-1 text-xs text-navy-700"><MapPin className="size-3.5" /> {p.city}</p>}
          </div>
          <button type="button" onClick={() => remove(p.id)} aria-label="Remove" className="self-start text-muted hover:text-red-600">
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
