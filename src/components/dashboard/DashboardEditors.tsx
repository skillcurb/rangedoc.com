"use client";
/**
 * Client pieces of the provider dashboard:
 *  - LocationEditor: form with click-on-map lat/lng picker
 *  - GalleryManager: add from media library, reorder, alt text, remove
 *  - FaqEditor: inline add/edit
 */
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { LocationPickerLazy } from "@/components/site/map";
import { MediaPickerModal } from "@/components/media/MediaLibrary";
import { ActionButton, ActionForm } from "@/components/forms/FormKit";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { addGalleryImages, deleteFaq, moveGalleryImage, removeGalleryImage, saveFaq, saveLocation, updateGalleryAlt } from "@/lib/actions/provider";

// ───────────────────────────── Locations ─────────────────────────────

type City = { id: number; name: string; stateCode: string; lat: number; lng: number };
export type LocationValue = { id?: number; name: string; address: string; address2: string | null; cityId: number | null; zip: string; lat: number; lng: number; phone: string | null };

export function LocationEditor({ cities, value, onDone }: { cities: City[]; value?: LocationValue; onDone?: () => void }) {
  const [lat, setLat] = useState<number | undefined>(value?.lat);
  const [lng, setLng] = useState<number | undefined>(value?.lng);
  return (
    <ActionForm action={saveLocation} onSuccess={onDone} className="grid gap-4 lg:grid-cols-2">
      <input type="hidden" name="id" value={value?.id ?? ""} />
      <div className="space-y-3">
        <input name="name" required defaultValue={value?.name} placeholder="Location name (e.g. Downtown Clinic) *" className="input" />
        <input name="address" required defaultValue={value?.address} placeholder="Street address *" className="input" />
        <input name="address2" defaultValue={value?.address2 ?? ""} placeholder="Suite / floor" className="input" />
        <div className="grid grid-cols-2 gap-3">
          <select
            name="cityId"
            required
            defaultValue={value?.cityId ?? ""}
            className="input"
            aria-label="City"
            onChange={(e) => {
              const c = cities.find((x) => x.id === Number(e.target.value));
              if (c && lat == null) {
                setLat(c.lat);
                setLng(c.lng);
              }
            }}
          >
            <option value="" disabled>
              City *
            </option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}, {c.stateCode}
              </option>
            ))}
          </select>
          <input name="zip" required defaultValue={value?.zip} placeholder="ZIP *" className="input" />
        </div>
        <input name="phone" defaultValue={value?.phone ?? ""} placeholder="Location phone (optional)" className="input" />
        <div className="grid grid-cols-2 gap-3">
          <input name="lat" required value={lat ?? ""} onChange={(e) => setLat(Number(e.target.value))} placeholder="Latitude" className="input" type="number" step="any" />
          <input name="lng" required value={lng ?? ""} onChange={(e) => setLng(Number(e.target.value))} placeholder="Longitude" className="input" type="number" step="any" />
        </div>
        <p className="help">Click the map (or drag the pin) to set the exact position of your clinic.</p>
        <SubmitButton pendingText="Saving…">{value?.id ? "Save location" : "Add location"}</SubmitButton>
      </div>
      <div className="h-80 overflow-hidden rounded-lg border border-line lg:h-full lg:min-h-80">
        <LocationPickerLazy
          lat={lat}
          lng={lng}
          onPick={(a, b) => {
            setLat(a);
            setLng(b);
          }}
        />
      </div>
    </ActionForm>
  );
}

export function LocationRowEdit({ cities, value }: { cities: City[]; value: LocationValue }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn-light btn-sm" onClick={() => setOpen(!open)}>
        <Pencil className="size-3.5" /> {open ? "Close" : "Edit"}
      </button>
      {open && (
        <div className="basis-full pt-4">
          <LocationEditor cities={cities} value={value} onDone={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}

// ───────────────────────────── Gallery ─────────────────────────────

export function GalleryManager({ images, max, canAdd }: { images: { id: number; url: string; alt: string | null }[]; max: number; canAdd: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">
          {images.length} / {max >= 100 ? "unlimited" : max} photos
        </p>
        <button type="button" className="btn-primary" disabled={!canAdd} onClick={() => setOpen(true)}>
          <ImagePlus className="size-4" /> Add photos
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((g, i) => (
          <div key={g.id} className="card overflow-hidden">
            <div className="relative aspect-[4/3] bg-surface">
              <Image src={g.url} alt={g.alt ?? ""} fill sizes="240px" className="object-cover" unoptimized={g.url.endsWith(".svg")} />
              {i === 0 && <span className="absolute top-2 left-2 rounded bg-navy-900 px-2 py-0.5 text-[10px] font-bold text-white">COVER</span>}
            </div>
            <div className="space-y-2 p-2">
              <input
                defaultValue={g.alt ?? ""}
                placeholder="Alt text (describe the photo)"
                className="input py-1.5 text-xs"
                onBlur={async (e) => {
                  if (e.target.value !== (g.alt ?? "")) {
                    await updateGalleryAlt(g.id, e.target.value);
                    toast.success("Alt text saved");
                  }
                }}
              />
              <div className="flex gap-1">
                <ActionButton run={() => moveGalleryImage(g.id, -1)} className="btn-light btn-sm px-2" title="Move left">
                  <ArrowUp className="size-3.5 -rotate-90" />
                </ActionButton>
                <ActionButton run={() => moveGalleryImage(g.id, 1)} className="btn-light btn-sm px-2" title="Move right">
                  <ArrowDown className="size-3.5 -rotate-90" />
                </ActionButton>
                <ActionButton run={() => removeGalleryImage(g.id)} confirm="Remove this photo from your gallery?" className="btn-light btn-sm ml-auto px-2 text-red-600" title="Remove">
                  <Trash2 className="size-3.5" />
                </ActionButton>
              </div>
            </div>
          </div>
        ))}
      </div>
      <MediaPickerModal
        open={open}
        onClose={() => setOpen(false)}
        multiple
        target="gallery"
        title="Upload or choose gallery photos"
        onSelect={async (items) => {
          const res = await addGalleryImages(items.map((m) => m.url));
          if (res?.error) toast.error(res.error);
          else toast.success(res?.message ?? "Added");
          router.refresh();
        }}
      />
    </div>
  );
}

// ───────────────────────────── FAQs ─────────────────────────────

export function FaqEditor({ faqs, canAdd }: { faqs: { id: number; question: string; answer: string }[]; canAdd: boolean }) {
  const [editing, setEditing] = useState<number | "new" | null>(null);
  return (
    <div className="space-y-3">
      {faqs.map((f) =>
        editing === f.id ? (
          <FaqForm key={f.id} faq={f} onDone={() => setEditing(null)} />
        ) : (
          <div key={f.id} className="card flex items-start gap-3 p-4">
            <div className="flex-1">
              <p className="font-semibold text-navy-900">{f.question}</p>
              <p className="mt-1 text-sm whitespace-pre-line text-navy-700">{f.answer}</p>
            </div>
            <button type="button" className="btn-light btn-sm" onClick={() => setEditing(f.id)}>
              <Pencil className="size-3.5" />
            </button>
            <ActionButton run={() => deleteFaq(f.id)} confirm="Delete this FAQ?" className="btn-light btn-sm text-red-600">
              <Trash2 className="size-3.5" />
            </ActionButton>
          </div>
        ),
      )}
      {editing === "new" ? (
        <FaqForm onDone={() => setEditing(null)} />
      ) : (
        <button type="button" className="btn-primary" disabled={!canAdd} onClick={() => setEditing("new")}>
          <Plus className="size-4" /> Add FAQ
        </button>
      )}
    </div>
  );
}

function FaqForm({ faq, onDone }: { faq?: { id: number; question: string; answer: string }; onDone: () => void }) {
  return (
    <ActionForm action={saveFaq} onSuccess={onDone} className="card space-y-3 p-4">
      <input type="hidden" name="id" value={faq?.id ?? ""} />
      <input name="question" required defaultValue={faq?.question} placeholder="Question" className="input" />
      <textarea name="answer" required rows={4} defaultValue={faq?.answer} placeholder="Answer" className="input" />
      <div className="flex gap-2">
        <SubmitButton pendingText="Saving…">Save FAQ</SubmitButton>
        <button type="button" className="btn-light" onClick={onDone}>
          Cancel
        </button>
      </div>
    </ActionForm>
  );
}
