"use client";
/**
 * Provider search box used in the home hero and at the top of /search.
 * ------------------------------------------------------------------
 *  - Provider type tabs (All / Physical Therapists / Chiropractors)
 *  - "What are you dealing with?" → pain / condition autocomplete
 *  - "City or ZIP" → auto-filled from the visitor's location, or pick a city
 *  - Find Care → /search with every choice in the URL
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Crosshair, MapPin, PersonStanding, Search, UserRound, Bone } from "lucide-react";
import { Autocomplete, type Suggestion } from "@/components/site/Autocomplete";
import { useVisitorLocation } from "@/lib/client/location";
import { cn } from "@/lib/utils";

export type SearchBoxValues = {
  type: string; // all | pt | chiro
  q: string;
  condition: string; // slug of the chosen condition (if picked from the list)
  specialty: string;
  locLabel: string;
  city: string;
  lat?: number;
  lng?: number;
};

const TABS = [
  { value: "all", label: "All Providers", Icon: UserRound },
  { value: "pt", label: "Physical Therapists", Icon: PersonStanding },
  { value: "chiro", label: "Chiropractors", Icon: Bone },
];

type Props = {
  initial?: Partial<SearchBoxValues>;
  submitLabel?: string;
  /** When given, called instead of navigating (search page updates in place) */
  onSearch?: (v: SearchBoxValues) => void;
  compact?: boolean;
};

export function buildSearchUrl(v: SearchBoxValues, extra: Record<string, string> = {}) {
  const p = new URLSearchParams();
  if (v.type && v.type !== "all") p.set("type", v.type);
  if (v.condition) p.set("condition", v.condition);
  else if (v.specialty) p.set("specialty", v.specialty);
  else if (v.q) p.set("q", v.q);
  if (v.city) p.set("city", v.city);
  if (v.lat != null && v.lng != null) {
    p.set("lat", v.lat.toFixed(5));
    p.set("lng", v.lng.toFixed(5));
  }
  if (v.locLabel) p.set("loc", v.locLabel);
  for (const [k, val] of Object.entries(extra)) if (val) p.set(k, val);
  return `/search?${p.toString()}`;
}

export function HeroSearch({ initial, submitLabel = "Find Care", onSearch, compact }: Props) {
  const router = useRouter();
  const { location, detect, setLocation } = useVisitorLocation();
  const [v, setV] = useState<SearchBoxValues>({
    type: initial?.type || "all",
    q: initial?.q || "",
    condition: initial?.condition || "",
    specialty: initial?.specialty || "",
    locLabel: initial?.locLabel || "",
    city: initial?.city || "",
    lat: initial?.lat,
    lng: initial?.lng,
  });
  const [detecting, setDetecting] = useState(false);

  // Auto-fill the location from the stored / detected visitor location
  useEffect(() => {
    if (v.locLabel) return;
    if (location) {
      setV((cur) => (cur.locLabel ? cur : { ...cur, locLabel: location.label, city: location.citySlug ?? "", lat: location.lat, lng: location.lng }));
    } else if (!initial?.locLabel) {
      // First visit: ask the browser (silently fails if the visitor declines)
      detect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  async function useMyLocation() {
    setDetecting(true);
    const loc = await detect();
    setDetecting(false);
    if (loc) setV((cur) => ({ ...cur, locLabel: loc.label, city: loc.citySlug ?? "", lat: loc.lat, lng: loc.lng }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (onSearch) onSearch(v);
    else router.push(buildSearchUrl(v));
  }

  return (
    <form onSubmit={submit} className={cn("rounded-2xl bg-white/95 p-4 shadow-pop ring-1 ring-line backdrop-blur sm:p-5", compact && "shadow-card")}>
      {/* Provider type tabs */}
      <div className="no-scrollbar mb-4 flex gap-1 overflow-x-auto rounded-full bg-surface p-1 sm:inline-flex">
        {TABS.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setV({ ...v, type: value })}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition sm:px-6",
              v.type === value ? "bg-brand-600 text-white shadow" : "text-navy-800 hover:bg-white",
            )}
            aria-pressed={v.type === value}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-[1.6fr_1fr_auto]">
        {/* Condition / pain autocomplete */}
        <Autocomplete
          kind="condition"
          value={v.q}
          onChange={(q) => setV({ ...v, q, condition: "", specialty: "" })}
          onSelect={(s: Suggestion) =>
            setV({ ...v, q: s.label, condition: s.type === "condition" ? s.slug ?? "" : "", specialty: s.type === "specialty" ? s.slug ?? "" : "" })
          }
          placeholder="What are you dealing with? (e.g. back pain, knee pain, headache)"
          ariaLabel="What are you dealing with?"
          icon={<Search className="size-5" />}
        />

        {/* City / ZIP autocomplete */}
        <Autocomplete
          kind="location"
          value={v.locLabel}
          onChange={(locLabel) => setV({ ...v, locLabel, city: "", lat: undefined, lng: undefined })}
          onSelect={(s) => {
            setV({ ...v, locLabel: s.label, city: s.slug ?? "", lat: s.lat, lng: s.lng });
            if (s.lat != null && s.lng != null) setLocation({ label: s.label, citySlug: s.slug ?? null, lat: s.lat, lng: s.lng, source: "manual" });
          }}
          placeholder="City or ZIP"
          icon={<MapPin className="size-5" />}
          extra={
            <button type="button" onClick={useMyLocation} className="flex w-full items-center gap-2 border-b border-line px-4 py-2.5 text-left text-sm font-medium text-brand-700 hover:bg-brand-50">
              <Crosshair className={cn("size-4", detecting && "animate-spin")} /> Use my current location
            </button>
          }
        />

        <button type="submit" className="btn-primary h-12 px-7 text-base">
          {submitLabel} <ArrowRight className="size-5" />
        </button>
      </div>
    </form>
  );
}
