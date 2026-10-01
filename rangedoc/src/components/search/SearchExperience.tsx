"use client";
/**
 * Search experience (used by /search and /providers).
 * ------------------------------------------------------------------
 *  - The URL query string is the single source of truth, so results are
 *    shareable and the back button works.
 *  - Results load from /api/search; more cards load automatically when
 *    the visitor scrolls near the end (IntersectionObserver).
 *  - Skeleton cards show while loading.
 *  - The map on the right shows the selected provider (or the first one).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Calendar, ChevronDown, ChevronUp, Globe2, Languages, Loader2, LocateFixed, MapPin, Search, ShieldCheck, SlidersHorizontal, UserRound, X } from "lucide-react";
import type { SearchFacets, SearchOutput, SearchResultCard as Card } from "@/lib/search";
import { SearchResultCard } from "@/components/search/SearchResultCard";
import { SearchCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/Misc";
import { HeroSearch, buildSearchUrl, type SearchBoxValues } from "@/components/site/HeroSearch";
import { ProviderMapLazy } from "@/components/site/map";
import { detectLocation, getStoredLocation } from "@/lib/client/location";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  /** Promo box under the map ("Not sure PT or Chiropractor?") */
  promo?: { title: string; text: string; href: string; cta: string; image?: string | null } | null;
};

const EMPTY_FACETS: SearchFacets = { types: { all: 0, PHYSICAL_THERAPIST: 0, CHIROPRACTOR: 0 }, distances: [], conditions: [], insurances: [], specialties: [] };

export function SearchExperience({ title, promo }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const paramString = params.toString();

  const [results, setResults] = useState<Card[]>([]);
  const [meta, setMeta] = useState<Omit<SearchOutput, "results"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false); // mobile
  const [mapOpen, setMapOpen] = useState(false); // mobile / tablet map toggle
  const isDesktop = useMediaQuery("(min-width: 1280px)");
  const sentinel = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  // ---------- URL helpers ----------
  const setParams = useCallback(
    (changes: Record<string, string | null>) => {
      const p = new URLSearchParams(paramString);
      for (const [k, v] of Object.entries(changes)) {
        if (v == null || v === "") p.delete(k);
        else p.set(k, v);
      }
      p.delete("page");
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [paramString, pathname, router],
  );

  const toggleListParam = (key: string, value: string) => {
    const current = (params.get(key) ?? "").split(",").filter(Boolean);
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    setParams({ [key]: next.join(",") || null });
  };

  // ---------- "near me": resolve the visitor location before searching ----------
  useEffect(() => {
    const p = new URLSearchParams(paramString);
    const hasLocation = p.get("city") || (p.get("lat") && p.get("lng"));
    if (hasLocation) return;
    const stored = getStoredLocation();
    if (stored) {
      setParams({ lat: stored.lat.toFixed(5), lng: stored.lng.toFixed(5), loc: stored.label, city: stored.citySlug, near: null });
    } else if (p.get("near") === "me") {
      detectLocation().then((loc) => {
        if (loc) setParams({ lat: loc.lat.toFixed(5), lng: loc.lng.toFixed(5), loc: loc.label, city: loc.citySlug, near: null });
        else setParams({ near: null });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramString]);

  // ---------- Fetch page 1 whenever the query changes ----------
  useEffect(() => {
    const p = new URLSearchParams(paramString);
    if (p.get("near") === "me") return; // wait for location detection
    const id = ++requestId.current;
    setLoading(true);
    fetch(`/api/search?${paramString}&page=1`)
      .then((r) => r.json())
      .then((data: SearchOutput) => {
        if (id !== requestId.current) return; // a newer search started
        const { results: list, ...rest } = data;
        setResults(list);
        setMeta(rest);
        setSelectedId(list[0]?.id ?? null); // map shows the first provider by default
      })
      .finally(() => id === requestId.current && setLoading(false));
  }, [paramString]);

  // ---------- Infinite scroll ----------
  const loadMore = useCallback(async () => {
    if (!meta?.hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    const id = requestId.current;
    try {
      const res = await fetch(`/api/search?${paramString}&page=${meta.page + 1}`);
      const data: SearchOutput = await res.json();
      if (id !== requestId.current) return;
      setResults((cur) => [...cur, ...data.results.filter((r) => !cur.some((c) => c.id === r.id))]);
      setMeta((m) => (m ? { ...m, page: data.page, hasMore: data.hasMore } : m));
    } finally {
      setLoadingMore(false);
    }
  }, [meta, loadingMore, loading, paramString]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  // ---------- Map data ----------
  const markers = useMemo(
    () =>
      results
        .filter((r) => r.location)
        .map((r) => ({ id: r.id, lat: r.location!.lat, lng: r.location!.lng, title: r.name, subtitle: r.location!.address, href: `/provider/${r.slug}` })),
    [results],
  );
  const center = useMemo(() => (meta?.center ? { lat: meta.center.lat, lng: meta.center.lng } : null), [meta?.center]);
  const selected = results.find((r) => r.id === selectedId) ?? results[0];

  // ---------- Initial values for the search box ----------
  const initial: Partial<SearchBoxValues> = {
    type: params.get("type") ?? "all",
    q: params.get("q") || (params.get("condition")?.split(",").length === 1 ? meta?.facets.conditions.find((c) => c.slug === params.get("condition"))?.name ?? "" : ""),
    condition: params.get("condition")?.split(",").length === 1 ? params.get("condition")! : "",
    locLabel: params.get("loc") ?? meta?.center?.label ?? "",
    city: params.get("city") ?? "",
    lat: params.get("lat") ? Number(params.get("lat")) : undefined,
    lng: params.get("lng") ? Number(params.get("lng")) : undefined,
  };
  const facets = meta?.facets ?? EMPTY_FACETS;
  const conditionLabel = params.get("q") || facets.conditions.find((c) => c.slug === params.get("condition"))?.name || "";

  const sidebar = (
    <Filters
      params={params}
      facets={facets}
      onSet={setParams}
      onToggle={toggleListParam}
      onClear={() => router.replace(`${pathname}?${new URLSearchParams(Object.fromEntries(["city", "lat", "lng", "loc", "q"].flatMap((k) => (params.get(k) ? [[k, params.get(k)!]] : [])))).toString()}`, { scroll: false })}
    />
  );

  return (
    <div>
      {/* ───── Top search band ───── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-50 to-white">
        <div className="relative mx-auto w-full max-w-[1520px] px-4 py-8 sm:px-6 lg:px-8">
          <p className="eyebrow">Real experts. A healthier you.</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{title}</h1>
          <p className="mt-1 text-navy-700">Licensed Physical Therapists and Chiropractors, so you can move better and live brighter.</p>
          <div className="mt-5">
            <HeroSearch
              key={paramString + (meta ? "1" : "0") /* re-sync inputs after URL changes */}
              initial={initial}
              submitLabel="Search"
              compact
              onSearch={(v) => {
                const url = buildSearchUrl(v, Object.fromEntries(["distance", "insurance", "sort", "telehealth", "newPatients", "verified", "gender"].flatMap((k) => (params.get(k) ? [[k, params.get(k)!]] : []))));
                router.replace(url.replace("/search", pathname), { scroll: false });
              }}
            />
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-[1520px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8 xl:grid-cols-[240px_1fr_340px]">
        {/* ───── Filters (desktop) ───── */}
        <aside className="hidden lg:block">
          <div className="card sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto p-4">{sidebar}</div>
        </aside>

        {/* ───── Results ───── */}
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-lg text-navy-900">
              {loading ? (
                <span className="inline-flex items-center gap-2 text-muted">
                  <Loader2 className="size-4 animate-spin" /> Finding providers…
                </span>
              ) : (
                <>
                  <b className="text-2xl">{meta?.total ?? 0}</b> providers{meta?.center ? <> near <b>{meta.center.label}</b></> : null}
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setFiltersOpen(true)} className="btn-light btn-sm lg:hidden">
                <SlidersHorizontal className="size-4" /> Filters
              </button>
              <label className="text-sm text-muted" htmlFor="sort">
                Sort by
              </label>
              <select id="sort" value={params.get("sort") ?? "best"} onChange={(e) => setParams({ sort: e.target.value === "best" ? null : e.target.value })} className="input w-auto py-2">
                <option value="best">Best match</option>
                <option value="distance">Distance</option>
                <option value="rating">Rating</option>
              </select>
            </div>
          </div>

          {/* Map for phones / tablets (the desktop map is in the right column) */}
          {!isDesktop && results.length > 0 && (
            <div className="mb-4">
              <button type="button" onClick={() => setMapOpen(!mapOpen)} className="btn-light btn-sm w-full">
                <MapPin className="size-4" /> {mapOpen ? "Hide map" : "Show map"}
              </button>
              {mapOpen && (
                <div className="mt-3 h-64 overflow-hidden rounded-xl border border-line">
                  <ProviderMapLazy markers={markers} selectedId={selected?.id ?? null} center={center} onSelect={(id) => setSelectedId(Number(id))} />
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <SearchCardSkeleton key={i} />)
            ) : results.length === 0 ? (
              <EmptyState
                icon={<Search className="size-10" />}
                title="No providers match your search"
                text="Try a larger distance, fewer filters, or a different city."
                action={
                  <button type="button" className="btn-primary" onClick={() => setParams({ distance: "0", insurance: null, condition: null, specialty: null })}>
                    Show all distances
                  </button>
                }
              />
            ) : (
              results.map((r, i) => <SearchResultCard key={r.id} p={r} position={i + 1} selected={r.id === selected?.id} onSelect={() => setSelectedId(r.id)} />)
            )}
            {loadingMore && (
              <>
                <SearchCardSkeleton />
                <SearchCardSkeleton />
              </>
            )}
            <div ref={sentinel} aria-hidden className="h-1" />
            {!loading && meta && !meta.hasMore && results.length > 0 && <p className="py-4 text-center text-sm text-muted">You&apos;ve reached the end of the list.</p>}
          </div>
        </div>

        {/* ───── Map + details ───── */}
        <aside className="hidden space-y-4 xl:block">
          <div className="card sticky top-20 space-y-4 overflow-hidden p-0">
            <div className="relative h-[420px]">
              {isDesktop && <ProviderMapLazy markers={markers} selectedId={selected?.id ?? null} center={center} onSelect={(id) => setSelectedId(Number(id))} />}
            </div>
            {selected && (
              <div className="flex items-center gap-3 px-4 pb-4">
                <MapPin className="size-5 shrink-0 text-brand-600" />
                <div className="min-w-0 text-sm">
                  <p className="truncate font-semibold text-navy-900">{selected.name}</p>
                  <p className="truncate text-muted">{selected.location?.address ?? selected.cityLabel}</p>
                </div>
              </div>
            )}
          </div>
          {promo && (
            <div className="card overflow-hidden bg-navy-50/60 p-4">
              <h3 className="text-lg font-bold">{promo.title}</h3>
              <p className="mt-1 text-sm text-navy-700">{promo.text}</p>
              <Link href={promo.href} className="btn-outline btn-sm mt-3">
                {promo.cta} <ArrowRight className="size-4" />
              </Link>
            </div>
          )}
          <SearchDetails params={params} conditionLabel={conditionLabel} locationLabel={meta?.center?.label} />
        </aside>
      </div>

      {/* ───── Mobile filters drawer ───── */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[95] lg:hidden">
          <div className="absolute inset-0 bg-navy-950/50" onClick={() => setFiltersOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-xs overflow-y-auto bg-white p-4 shadow-pop">
            <div className="mb-2 flex justify-end">
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
                <X className="size-6" />
              </button>
            </div>
            {sidebar}
            <button type="button" className="btn-primary mt-4 w-full" onClick={() => setFiltersOpen(false)}>
              Show {meta?.total ?? 0} results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** true when the CSS media query matches (updates on resize) */
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

// ───────────────────────────── Filters sidebar ─────────────────────────────

function FilterGroup({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line py-3 last:border-0">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-sm font-bold text-navy-900">
        {title} {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      {open && <div className="mt-2 space-y-1.5">{children}</div>}
    </div>
  );
}

function CheckList({ items, selected, onToggle, searchable }: { items: { slug: string; name: string; count: number }[]; selected: string[]; onToggle: (slug: string) => void; searchable?: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState("");
  // Always show the selected ones, even if count is 0
  const list = items.filter((i) => !filter || i.name.toLowerCase().includes(filter.toLowerCase()));
  const visible = showAll ? list : list.slice(0, 5);
  return (
    <>
      {searchable && <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search…" className="input mb-1 py-1.5 text-xs" />}
      {visible.map((i) => (
        <label key={i.slug} className="flex cursor-pointer items-center gap-2 text-sm text-navy-800">
          <input type="checkbox" className="checkbox" checked={selected.includes(i.slug)} onChange={() => onToggle(i.slug)} />
          <span className="flex-1">{i.name}</span>
          <span className="text-xs text-muted">({i.count})</span>
        </label>
      ))}
      {list.length > 5 && (
        <button type="button" onClick={() => setShowAll(!showAll)} className="flex items-center gap-1 text-sm font-medium text-navy-600">
          {showAll ? "Show less" : "Show more"} <ChevronDown className={cn("size-4", showAll && "rotate-180")} />
        </button>
      )}
      {!list.length && <p className="text-xs text-muted">No options for this search.</p>}
    </>
  );
}

function Filters({
  params,
  facets,
  onSet,
  onToggle,
  onClear,
}: {
  params: URLSearchParams | ReturnType<typeof useSearchParams>;
  facets: SearchFacets;
  onSet: (c: Record<string, string | null>) => void;
  onToggle: (key: string, value: string) => void;
  onClear: () => void;
}) {
  const type = params.get("type") ?? "all";
  const distance = params.get("distance") ?? "";
  const list = (k: string) => (params.get(k) ?? "").split(",").filter(Boolean);
  const radio = (checked: boolean) => cn("grid size-4 place-items-center rounded-full border", checked ? "border-brand-600" : "border-navy-300");

  return (
    <div>
      <div className="flex items-center justify-between pb-2">
        <h2 className="text-lg font-bold">Filters</h2>
        <button type="button" onClick={onClear} className="text-sm font-medium text-navy-600 hover:underline">
          Clear All
        </button>
      </div>

      <FilterGroup title="Provider Type">
        {[
          { v: "all", label: "All Providers", n: facets.types.all },
          { v: "pt", label: "Physical Therapists", n: facets.types.PHYSICAL_THERAPIST },
          { v: "chiro", label: "Chiropractors", n: facets.types.CHIROPRACTOR },
        ].map((o) => (
          <button type="button" key={o.v} onClick={() => onSet({ type: o.v === "all" ? null : o.v })} className="flex w-full items-center gap-2 text-left text-sm text-navy-800">
            <span className={radio(type === o.v)}>{type === o.v && <span className="size-2 rounded-full bg-brand-600" />}</span>
            {o.label} <span className="text-xs text-muted">({o.n})</span>
          </button>
        ))}
      </FilterGroup>

      <FilterGroup title="Distance">
        {facets.distances.map((d) => (
          <button type="button" key={d.miles} onClick={() => onSet({ distance: String(d.miles) })} className="flex w-full items-center gap-2 text-left text-sm text-navy-800">
            <span className={radio(distance === String(d.miles))}>{distance === String(d.miles) && <span className="size-2 rounded-full bg-brand-600" />}</span>
            {d.miles} miles <span className="text-xs text-muted">({d.count})</span>
          </button>
        ))}
        <button type="button" onClick={() => onSet({ distance: "0" })} className="flex w-full items-center gap-2 text-left text-sm text-navy-800">
          <span className={radio(distance === "0")}>{distance === "0" && <span className="size-2 rounded-full bg-brand-600" />}</span>
          Any distance
        </button>
      </FilterGroup>

      <FilterGroup title="Insurance">
        <CheckList items={facets.insurances} selected={list("insurance")} onToggle={(s) => onToggle("insurance", s)} searchable />
      </FilterGroup>

      <FilterGroup title="Condition / Pain Area">
        <CheckList items={facets.conditions} selected={list("condition")} onToggle={(s) => onToggle("condition", s)} />
      </FilterGroup>

      <FilterGroup title="Specialty">
        <CheckList items={facets.specialties} selected={list("specialty")} onToggle={(s) => onToggle("specialty", s)} />
      </FilterGroup>

      <FilterGroup title="More options" defaultOpen={false}>
        {[
          { k: "telehealth", label: "Offers telehealth" },
          { k: "newPatients", label: "Accepting new patients" },
          { k: "verified", label: "License verified only" },
        ].map((o) => (
          <label key={o.k} className="flex cursor-pointer items-center gap-2 text-sm text-navy-800">
            <input type="checkbox" className="checkbox" checked={params.get(o.k) === "1"} onChange={(e) => onSet({ [o.k]: e.target.checked ? "1" : null })} />
            {o.label}
          </label>
        ))}
        <select value={params.get("gender") ?? ""} onChange={(e) => onSet({ gender: e.target.value || null })} className="input mt-1 py-1.5 text-sm">
          <option value="">Any gender</option>
          <option value="Female">Female</option>
          <option value="Male">Male</option>
        </select>
      </FilterGroup>
    </div>
  );
}

// ───────────────────────── "Your search details" box ─────────────────────────

function SearchDetails({ params, conditionLabel, locationLabel }: { params: ReturnType<typeof useSearchParams>; conditionLabel: string; locationLabel?: string }) {
  const d = params.get("distance");
  const items = [
    { Icon: Search, label: "Condition", value: conditionLabel || "Any" },
    { Icon: MapPin, label: "Location", value: locationLabel || params.get("loc") || "Anywhere" },
    { Icon: LocateFixed, label: "Distance", value: d === "0" ? "Any distance" : `Within ${d || 25} miles` },
    { Icon: Globe2, label: "In-person / Telehealth", value: params.get("telehealth") === "1" ? "Telehealth" : "Any" },
    { Icon: ShieldCheck, label: "Insurance", value: params.get("insurance")?.split(",").length ? `${params.get("insurance")!.split(",").length} selected` : "Any" },
    { Icon: UserRound, label: "Gender", value: params.get("gender") || "Any" },
    { Icon: Calendar, label: "Availability", value: params.get("newPatients") === "1" ? "Accepting new patients" : "Any" },
    { Icon: Languages, label: "Verified only", value: params.get("verified") === "1" ? "Yes" : "No" },
  ];
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-bold">Your search details</h3>
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-1 text-sm font-medium text-navy-600">
          Edit search <ArrowRight className="size-4" />
        </button>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        {items.map(({ Icon, label, value }) => (
          <div key={label} className="flex gap-2">
            <Icon className="mt-0.5 size-4 shrink-0 text-navy-700" />
            <div className="min-w-0 text-xs">
              <dt className="text-navy-900">{label}</dt>
              <dd className="truncate text-muted">{value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}
