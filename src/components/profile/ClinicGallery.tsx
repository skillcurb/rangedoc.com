"use client";
/**
 * Clinic photo grid (1 large + 3 small) and full-screen gallery.
 * "See all photos" opens every gallery image with next/prev arrows.
 * Tracks GALLERY_VIEW (opened) and PHOTO_VIEW (each image looked at).
 */
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, ChevronLeft, ChevronRight, Images } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { track } from "@/lib/client/track";
import { cn } from "@/lib/utils";

export type GalleryPhoto = { id: number; url: string; alt: string | null };

export function ClinicGallery({ providerId, photos, visible = 4 }: { providerId: number; photos: GalleryPhoto[]; visible?: number }) {
  const [index, setIndex] = useState<number | null>(null);

  const open = (i: number) => {
    setIndex(i);
    track("GALLERY_VIEW", { providerId, meta: { imageId: photos[i]?.id } });
  };

  const go = useCallback(
    (dir: number) => {
      setIndex((cur) => {
        if (cur == null) return cur;
        const next = (cur + dir + photos.length) % photos.length;
        track("PHOTO_VIEW", { providerId, meta: { imageId: photos[next].id } });
        return next;
      });
    },
    [photos, providerId],
  );

  useEffect(() => {
    if (index == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go]);

  if (!photos.length) {
    return (
      <div className="grid h-48 place-items-center rounded-lg bg-surface text-sm text-muted">
        <span className="flex items-center gap-2">
          <Images className="size-5" /> No photos yet
        </span>
      </div>
    );
  }

  const shown = photos.slice(0, visible);
  const src = (u: string) => u;
  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">Clinic Photos</h2>
        <button type="button" onClick={() => open(0)} className="flex items-center gap-1 text-sm font-medium text-navy-600 hover:text-brand-700">
          See all photos ({photos.length}) <ArrowRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {shown.map((p, i) => (
          <button
            type="button"
            key={p.id}
            onClick={() => open(i)}
            className={cn("relative overflow-hidden rounded-lg bg-surface", i === 0 ? "col-span-3 aspect-[16/8]" : "aspect-[4/3]")}
            aria-label={`Open photo ${i + 1}`}
          >
            <Image src={src(p.url)} alt={p.alt || "Clinic photo"} fill sizes={i === 0 ? "(max-width:768px) 100vw, 400px" : "150px"} className="object-cover transition hover:scale-105" unoptimized={p.url.endsWith(".svg")} />
            {i === visible - 1 && photos.length > visible && <span className="absolute inset-0 grid place-items-center bg-navy-950/50 text-lg font-bold text-white">+{photos.length - visible}</span>}
          </button>
        ))}
      </div>

      <Modal open={index != null} onClose={() => setIndex(null)} size="full" className="bg-navy-950">
        {index != null && (
          <div className="flex flex-col">
            <div className="relative aspect-[16/10] w-full bg-navy-950">
              <Image src={photos[index].url} alt={photos[index].alt || "Clinic photo"} fill sizes="100vw" className="object-contain" unoptimized={photos[index].url.endsWith(".svg")} />
              <button type="button" onClick={() => go(-1)} className="absolute top-1/2 left-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 hover:bg-white" aria-label="Previous photo">
                <ChevronLeft className="size-6" />
              </button>
              <button type="button" onClick={() => go(1)} className="absolute top-1/2 right-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 hover:bg-white" aria-label="Next photo">
                <ChevronRight className="size-6" />
              </button>
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                {index + 1} / {photos.length}
              </span>
            </div>
            <div className="no-scrollbar flex gap-2 overflow-x-auto bg-navy-950 p-3">
              {photos.map((p, i) => (
                <button type="button" key={p.id} onClick={() => setIndex(i)} className={cn("relative h-16 w-24 shrink-0 overflow-hidden rounded", i === index ? "ring-2 ring-brand-400" : "opacity-60 hover:opacity-100")}>
                  <Image src={p.url} alt={p.alt || ""} fill sizes="96px" className="object-cover" unoptimized={p.url.endsWith(".svg")} />
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
