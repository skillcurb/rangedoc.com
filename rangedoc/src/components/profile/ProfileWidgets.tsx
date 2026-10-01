"use client";
/**
 * Small interactive pieces of the profile page:
 *  - <DistanceAway>  "2.3 miles away" from the visitor's location
 *  - <FaqList>       accordion, 3 shown; "View all FAQs" reveals the rest (paid plans)
 *  - <ReviewForm>    visitor review with star picker (paid plans)
 *  - <ExpandableList> "View all accepted insurance"
 */
import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import { useVisitorLocation } from "@/lib/client/location";
import { distanceMiles, formatMiles } from "@/lib/geo";
import { StarInput } from "@/components/ui/Stars";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { submitReview } from "@/lib/actions/public";
import { cn } from "@/lib/utils";

export function DistanceAway({ points, className, suffix = " away" }: { points: { lat: number; lng: number }[]; className?: string; suffix?: string }) {
  const { location } = useVisitorLocation();
  if (!location || !points.length) return null;
  const d = Math.min(...points.map((p) => distanceMiles(location.lat, location.lng, p.lat, p.lng)));
  return (
    <span className={className}>
      {formatMiles(d)}
      {suffix}
    </span>
  );
}

export function FaqList({ faqs, visible = 3, allowAll }: { faqs: { id: number; question: string; answer: string }[]; visible?: number; allowAll: boolean }) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const list = showAll ? faqs : faqs.slice(0, visible);
  return (
    <div>
      <div className="grid gap-3 md:grid-cols-3">
        {list.map((f) => (
          <div key={f.id} className={cn("rounded-lg border border-line bg-white", openId === f.id && "md:col-span-3")}>
            <button type="button" onClick={() => setOpenId(openId === f.id ? null : f.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-navy-900" aria-expanded={openId === f.id}>
              {f.question}
              <ChevronDown className={cn("size-4 shrink-0 transition", openId === f.id && "rotate-180")} />
            </button>
            {openId === f.id && <p className="px-4 pb-4 text-sm leading-6 whitespace-pre-line text-navy-700">{f.answer}</p>}
          </div>
        ))}
      </div>
      {allowAll && faqs.length > visible && (
        <button type="button" onClick={() => setShowAll(!showAll)} className="mt-3 flex items-center gap-1 text-sm font-medium text-navy-600 hover:text-brand-700">
          {showAll ? "Show fewer FAQs" : `View all FAQs (${faqs.length})`} <ArrowRight className="size-4" />
        </button>
      )}
    </div>
  );
}

export function ReviewForm({ providerId }: { providerId: number }) {
  const [state, action] = useActionState(submitReview, null);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Thanks!");
      formRef.current?.reset();
      setOpen(false);
    } else if (state.error) toast.error(state.error);
  }, [state]);

  if (!open) {
    return (
      <button type="button" className="btn-outline" onClick={() => setOpen(true)}>
        Write a review
      </button>
    );
  }
  return (
    <form ref={formRef} action={action} className="space-y-3 rounded-xl border border-line bg-surface p-4">
      <input type="hidden" name="providerId" value={providerId} />
      <div>
        <p className="label">Your rating</p>
        <StarInput name="rating" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="authorName" required placeholder="Your name *" className="input" />
        <input name="authorEmail" type="email" placeholder="Email (not shown)" className="input" />
      </div>
      <input name="title" placeholder="Review title" className="input" />
      <textarea name="body" required rows={4} placeholder="Tell others about your experience" className="input" />
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-light" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <SubmitButton pendingText="Submitting…">Submit review</SubmitButton>
      </div>
    </form>
  );
}

export function ExpandableList({ items, visible = 7, moreLabel }: { items: string[]; visible?: number; moreLabel: string }) {
  const [all, setAll] = useState(false);
  const list = all ? items : items.slice(0, visible);
  return (
    <>
      <ul className="space-y-2">
        {list.map((i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-navy-800">
            <Check className="size-4 shrink-0 text-brand-600" /> {i}
          </li>
        ))}
      </ul>
      {items.length > visible && (
        <button type="button" onClick={() => setAll(!all)} className="mt-3 flex items-center gap-1 text-sm font-medium text-navy-600 hover:text-brand-700">
          {all ? "Show less" : moreLabel} <ArrowRight className="size-4" />
        </button>
      )}
    </>
  );
}

export function DirectionsLink({ providerId, address }: { providerId: number; address: string }) {
  return (
    <a
      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => import("@/lib/client/track").then((m) => m.track("DIRECTIONS_CLICK", { providerId }))}
      className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-navy-600 hover:text-brand-700"
    >
      <MapPin className="size-3.5" /> Get Directions <ArrowRight className="size-3.5" />
    </a>
  );
}
