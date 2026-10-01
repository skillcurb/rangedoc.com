/**
 * Provider search engine.
 * ------------------------------------------------------------------
 * Used by /search, /providers, city & condition pages and /api/search.
 *
 * How it works:
 *  1. Resolve the search centre (visitor lat/lng, or the chosen city).
 *  2. Ask MySQL for candidate providers inside a bounding box around the
 *     centre that match the text query (fast, uses the lat/lng index).
 *  3. In JavaScript: exact distance, sidebar filters, facet counts,
 *     ranking tier (paid → claimed free → unclaimed) and "match %".
 *  4. Load full card data only for the current page.
 *
 * This comfortably handles tens of thousands of providers. For much larger
 * directories move step 2–3 into raw SQL or a search engine (Meilisearch,
 * Elasticsearch) – the public API of this file can stay the same.
 */
import "server-only";
import type { SQL } from "drizzle-orm";
import { db, t, eq, and, or, like, inArray, between, asc, desc, avg, count, pluck } from "@/lib/db";
import { boundingBox, distanceMiles } from "@/lib/geo";
import { hasActivePaidPlan, providerFeatures, rankTier } from "@/lib/plans";
import { PROVIDER_TYPE_LABEL, TYPE_PARAM_TO_ENUM, providerName, splitList } from "@/lib/utils";
import { getSettings } from "@/lib/settings";

export type SearchInput = {
  type?: string; // "pt" | "chiro" | "all"
  q?: string; // free text: "lower back pain", provider name…
  condition?: string[]; // condition slugs
  insurance?: string[]; // insurance slugs
  specialty?: string[]; // specialty slugs
  city?: string; // city slug
  lat?: number;
  lng?: number;
  loc?: string; // display label for the location ("Austin, TX")
  distance?: number; // radius in miles, 0 = any distance
  telehealth?: boolean;
  newPatients?: boolean;
  verified?: boolean;
  gender?: string;
  sort?: "best" | "distance" | "rating";
  page?: number;
  pageSize?: number;
};

export type SearchResultCard = {
  id: number;
  slug: string;
  name: string;
  typeLabel: string;
  headline: string | null;
  photo: string | null;
  rating: number | null;
  reviewCount: number;
  distance: number | null;
  cityLabel: string;
  conditions: string[];
  insurances: string[];
  moreInsurances: number;
  licenseVerified: boolean;
  claimed: boolean;
  isPaid: boolean;
  featuredBadge: boolean;
  telehealth: boolean;
  acceptingNewPatients: boolean;
  matchPercent: number | null;
  whyMatches: string[];
  hasPhone: boolean;
  hasWebsite: boolean;
  location: { lat: number; lng: number; name: string; address: string } | null;
};

export type SearchFacets = {
  types: { all: number; PHYSICAL_THERAPIST: number; CHIROPRACTOR: number };
  distances: { miles: number; count: number }[];
  conditions: { slug: string; name: string; count: number }[];
  insurances: { slug: string; name: string; count: number }[];
  specialties: { slug: string; name: string; count: number }[];
};

export type SearchOutput = {
  results: SearchResultCard[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  center: { lat: number; lng: number; label: string; citySlug: string | null } | null;
  facets: SearchFacets;
};

const DISTANCE_BUCKETS = [5, 10, 25, 50];

/** Parse URL search params (strings) into a typed SearchInput */
export function parseSearchParams(sp: Record<string, string | string[] | undefined>): SearchInput {
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const many = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v : v ? [v] : []).flatMap((x) => splitList(x));
  };
  const num = (k: string) => {
    const v = one(k);
    const n = v != null && v !== "" ? Number(v) : undefined;
    return n != null && Number.isFinite(n) ? n : undefined;
  };
  const sort = one("sort");
  return {
    type: one("type") || "all",
    q: one("q")?.trim() || undefined,
    condition: many("condition"),
    insurance: many("insurance"),
    specialty: many("specialty"),
    city: one("city") || undefined,
    lat: num("lat"),
    lng: num("lng"),
    loc: one("loc") || undefined,
    distance: num("distance"),
    telehealth: one("telehealth") === "1",
    newPatients: one("newPatients") === "1",
    verified: one("verified") === "1",
    gender: one("gender") || undefined,
    sort: sort === "distance" || sort === "rating" ? sort : "best",
    page: Math.max(1, num("page") ?? 1),
  };
}

/** Find the closest active city to a point (used to label the visitor's location) */
export async function findNearestCity(lat: number, lng: number) {
  const cities = await db.query.cities.findMany({
    where: eq(t.cities.active, true),
    columns: { id: true, name: true, stateCode: true, slug: true, lat: true, lng: true },
  });
  let best: (typeof cities)[number] | null = null;
  let bestD = Infinity;
  for (const c of cities) {
    const d = distanceMiles(lat, lng, c.lat, c.lng);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best ? { ...best, distance: bestD } : null;
}

export async function searchProviders(input: SearchInput): Promise<SearchOutput> {
  const settings = await getSettings();
  const pageSize = input.pageSize ?? settings.search.pageSize;
  const page = input.page ?? 1;
  const radius = input.distance ?? settings.search.defaultRadiusMiles;

  // ---- 1. Resolve the centre point ---------------------------------
  let center: SearchOutput["center"] = null;
  if (input.lat != null && input.lng != null) {
    center = { lat: input.lat, lng: input.lng, label: input.loc || "Your location", citySlug: input.city ?? null };
  } else if (input.city) {
    const city = await db.query.cities.findFirst({ where: eq(t.cities.slug, input.city) });
    if (city) center = { lat: city.lat, lng: city.lng, label: `${city.name}, ${city.stateCode}`, citySlug: city.slug };
  }

  // ---- 2. Text query → matching conditions / specialties -----------
  // WHERE conditions for the candidate query, combined with AND at the end
  const P = t.providers;
  const where: (SQL | undefined)[] = [eq(P.status, "ACTIVE")];
  const q = input.q?.toLowerCase();
  let queryConditionIds: number[] = [];
  if (q) {
    const [conds, specs] = await Promise.all([
      db.query.conditions.findMany({ where: eq(t.conditions.active, true), columns: { id: true, name: true, slug: true, keywords: true } }),
      db.query.specialties.findMany({ columns: { id: true, name: true } }),
    ]);
    // A condition matches when the query mentions it ("lower back pain" → "Back Pain")
    // or one of its keywords, or the other way round ("back" → "Back Pain").
    queryConditionIds = conds
      .filter((c) => {
        const terms = [c.name, c.slug.replace(/-/g, " "), ...splitList(c.keywords)].map((t) => t.toLowerCase());
        return terms.some((t) => t && (q.includes(t) || t.includes(q)));
      })
      .map((c) => c.id);
    const specIds = specs.filter((s) => q.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(q)).map((s) => s.id);
    // MySQL's default collation is case-insensitive, so LIKE ignores case
    const text = `%${input.q}%`;
    const anyOf: (SQL | undefined)[] = [like(P.firstName, text), like(P.lastName, text), like(P.practiceName, text), like(P.headline, text)];
    // "Has one of these conditions / specialties" = provider id is in the join table subquery
    if (queryConditionIds.length) {
      anyOf.push(
        inArray(
          P.id,
          db.select({ id: t.providerConditions.providerId }).from(t.providerConditions).where(inArray(t.providerConditions.conditionId, queryConditionIds)),
        ),
      );
    }
    if (specIds.length) {
      anyOf.push(
        inArray(
          P.id,
          db.select({ id: t.providerSpecialties.providerId }).from(t.providerSpecialties).where(inArray(t.providerSpecialties.specialtyId, specIds)),
        ),
      );
    }
    // Whole name search, e.g. "Sarah Kim"
    const words = input.q!.split(/\s+/);
    if (words.length >= 2) anyOf.push(and(like(P.firstName, `%${words[0]}%`), like(P.lastName, `%${words[words.length - 1]}%`)));
    where.push(or(...anyOf));
  }

  // Location pre-filter: bounding box big enough for the largest distance bucket
  if (center && radius > 0) {
    const box = boundingBox(center.lat, center.lng, Math.max(radius, 50));
    const L = t.providerLocations;
    // Provider has at least one location inside the box (uses the lat/lng index)
    where.push(
      inArray(
        P.id,
        db
          .select({ id: L.providerId })
          .from(L)
          .where(and(between(L.lat, box.minLat, box.maxLat), between(L.lng, box.minLng, box.maxLng))),
      ),
    );
  }
  if (input.telehealth) where.push(eq(P.telehealth, true));
  if (input.newPatients) where.push(eq(P.acceptingNewPatients, true));
  if (input.verified) where.push(eq(P.licenseVerified, true));
  if (input.gender) where.push(eq(P.gender, input.gender));

  // ---- 3. Candidates (light-weight select) -------------------------
  const candidateRows = await db.query.providers.findMany({
    where: and(...where),
    columns: { id: true, providerType: true, claimStatus: true, planExpiresAt: true, displayRating: true },
    with: {
      plan: true,
      locations: { columns: { lat: true, lng: true, isPrimary: true, sortOrder: true } },
      // Many-to-many: only the linked ids are needed here (join table rows)
      conditions: { columns: { conditionId: true } },
      insurances: { columns: { insuranceId: true } },
      specialties: { columns: { specialtyId: true } },
    },
    limit: 5000, // safety cap
  });
  // Turn join rows into [{ id }] lists so the filter/facet code below stays simple
  const candidates = candidateRows.map((c) => ({
    ...c,
    conditions: c.conditions.map((x) => ({ id: x.conditionId })),
    insurances: c.insurances.map((x) => ({ id: x.insuranceId })),
    specialties: c.specialties.map((x) => ({ id: x.specialtyId })),
  }));

  // Map slugs → ids for the sidebar filters
  const [allConditions, allInsurances, allSpecialties] = await Promise.all([
    db.query.conditions.findMany({
      where: eq(t.conditions.active, true),
      columns: { id: true, slug: true, name: true },
      orderBy: [asc(t.conditions.sortOrder)],
    }),
    db.query.insurances.findMany({ columns: { id: true, slug: true, name: true }, orderBy: [asc(t.insurances.sortOrder)] }),
    db.query.specialties.findMany({ columns: { id: true, slug: true, name: true }, orderBy: [asc(t.specialties.sortOrder)] }),
  ]);
  const idsFor = (list: { id: number; slug: string }[], slugs?: string[]) => list.filter((x) => slugs?.includes(x.slug)).map((x) => x.id);
  const condIds = idsFor(allConditions, input.condition);
  const insIds = idsFor(allInsurances, input.insurance);
  const specIds = idsFor(allSpecialties, input.specialty);
  const typeEnum = input.type ? TYPE_PARAM_TO_ENUM[input.type] : undefined;

  // Review averages (approved reviews) for rating sort / display
  const R = t.reviews;
  const reviewStats = candidates.length
    ? await db
        .select({ providerId: R.providerId, avg: avg(R.rating), n: count() })
        .from(R)
        .where(and(eq(R.status, "APPROVED"), inArray(R.providerId, candidates.map((c) => c.id))))
        .groupBy(R.providerId)
    : [];
  // avg() comes back from MySQL as a string (DECIMAL) → Number()
  const reviewMap = new Map(reviewStats.map((r) => [r.providerId, { avg: Number(r.avg ?? 0), count: Number(r.n) }]));

  // Distance for every candidate (closest of its locations)
  type Scored = (typeof candidates)[number] & { distance: number | null; tier: number; match: number; rating: number };
  const scored: Scored[] = candidates.map((c) => {
    let distance: number | null = null;
    if (center) {
      for (const l of c.locations) {
        const d = distanceMiles(center.lat, center.lng, l.lat, l.lng);
        if (distance == null || d < distance) distance = d;
      }
    }
    const matchedConds = [...new Set([...condIds, ...queryConditionIds])].filter((id) => c.conditions.some((x) => x.id === id)).length;
    const matchedIns = insIds.filter((id) => c.insurances.some((x) => x.id === id)).length;
    const r = reviewMap.get(c.id);
    const rating = c.displayRating ?? r?.avg ?? 0;
    return { ...c, distance, tier: rankTier(c), match: matchedConds * 10 + matchedIns * 5, rating };
  });

  // Base set = within radius (used for type/condition/insurance facet counts)
  const inRadius = (s: Scored, miles: number) => !center || miles <= 0 || (s.distance != null && s.distance <= miles);
  const base = scored.filter((s) => inRadius(s, radius));

  const hasAll = (have: { id: number }[], want: number[]) => want.every((id) => have.some((h) => h.id === id));
  const passesSidebar = (s: Scored) =>
    (!condIds.length || condIds.some((id) => s.conditions.some((x) => x.id === id))) &&
    (!insIds.length || insIds.some((id) => s.insurances.some((x) => x.id === id))) &&
    (!specIds.length || hasAll(s.specialties, specIds));

  const filtered = base.filter((s) => (!typeEnum || s.providerType === typeEnum) && passesSidebar(s));

  // ---- Facet counts --------------------------------------------------
  const typeBase = base.filter(passesSidebar);
  const countBy = (list: { id: number; slug: string; name: string }[], pick: (s: Scored) => { id: number }[]) =>
    list
      .map((x) => ({ slug: x.slug, name: x.name, count: base.filter((s) => (!typeEnum || s.providerType === typeEnum) && pick(s).some((p) => p.id === x.id)).length }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count);
  const facets: SearchFacets = {
    types: {
      all: typeBase.length,
      PHYSICAL_THERAPIST: typeBase.filter((s) => s.providerType === "PHYSICAL_THERAPIST").length,
      CHIROPRACTOR: typeBase.filter((s) => s.providerType === "CHIROPRACTOR").length,
    },
    distances: DISTANCE_BUCKETS.map((miles) => ({
      miles,
      count: scored.filter((s) => inRadius(s, miles) && (!typeEnum || s.providerType === typeEnum) && passesSidebar(s)).length,
    })),
    conditions: countBy(allConditions, (s) => s.conditions),
    insurances: countBy(allInsurances, (s) => s.insurances),
    specialties: countBy(allSpecialties, (s) => s.specialties),
  };

  // ---- 4. Sort: tier always first (paid → claimed → unclaimed) -------
  filtered.sort((a, b) => {
    if (b.tier !== a.tier) return b.tier - a.tier;
    if (input.sort === "rating") return b.rating - a.rating;
    if (input.sort === "distance" || !input.sort || input.sort === "best") {
      if (input.sort === "best" && b.match !== a.match) return b.match - a.match;
      if (a.distance != null && b.distance != null && a.distance !== b.distance) return a.distance - b.distance;
    }
    return b.rating - a.rating || a.id - b.id;
  });

  const total = filtered.length;
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  // ---- 5. Load full card data for this page --------------------------
  const fullRows = pageItems.length
    ? await db.query.providers.findMany({
        where: inArray(P.id, pageItems.map((p) => p.id)),
        with: {
          plan: true,
          city: true,
          conditions: { with: { condition: { columns: { id: true, name: true, sortOrder: true } } } },
          insurances: { with: { insurance: { columns: { name: true, sortOrder: true } } } },
          locations: { orderBy: [desc(t.providerLocations.isPrimary), asc(t.providerLocations.sortOrder)] },
        },
      })
    : [];
  // Flatten the many-to-many join rows; they can't be ordered by the
  // linked table in SQL, so sort by sortOrder here
  const bySort = (a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder;
  const full = fullRows.map((f) => ({
    ...f,
    conditions: pluck(f.conditions, "condition").sort(bySort),
    insurances: pluck(f.insurances, "insurance").sort(bySort),
  }));
  const freePlan = await db.query.plans.findFirst({ where: and(eq(t.plans.isFree, true), eq(t.plans.active, true)) });
  const byId = new Map(full.map((f) => [f.id, f]));
  const wantedConditionIds = [...new Set([...condIds, ...queryConditionIds])];

  const results: SearchResultCard[] = pageItems.flatMap((s) => {
    const p = byId.get(s.id);
    if (!p) return [];
    const features = providerFeatures(p, freePlan);
    // Only show as many locations as the plan allows
    const locations = p.locations.slice(0, features.maxLocations);
    let closest = locations[0] ?? null;
    if (center && locations.length > 1) {
      closest = [...locations].sort((a, b) => distanceMiles(center!.lat, center!.lng, a.lat, a.lng) - distanceMiles(center!.lat, center!.lng, b.lat, b.lng))[0];
    }
    const review = reviewMap.get(p.id);
    const rating = features.allowRatingDisplay && p.displayRating ? p.displayRating : features.allowReviews && review?.count ? review.avg : null;
    const reviewCount = features.allowRatingDisplay && p.displayRating ? p.displayReviewCount ?? review?.count ?? 0 : review?.count ?? 0;

    // "Why this matches you" bullets
    const why: string[] = [];
    const matched = p.conditions.filter((c) => wantedConditionIds.includes(c.id));
    if (matched.length) why.push(`Specializes in ${matched.map((m) => m.name.toLowerCase()).slice(0, 2).join(" & ")}`);
    const insNames = allInsurances.filter((i) => insIds.includes(i.id)).map((i) => i.name);
    const acceptedIns = p.insurances.filter((i) => insNames.includes(i.name)).map((i) => i.name);
    if (acceptedIns.length) why.push(`Accepts your insurance (${acceptedIns[0]})`);
    if (p.telehealth && p.inPerson) why.push("Offers in-person & telehealth");
    else if (p.telehealth) why.push("Offers telehealth visits");
    if (p.acceptingNewPatients && why.length < 3) why.push("Accepting new patients");
    if (p.licenseVerified && why.length < 3) why.push("License verified");

    const hasIntent = wantedConditionIds.length > 0 || insIds.length > 0 || !!q;
    const matchPercent = hasIntent
      ? Math.min(98, 70 + s.match + (s.distance != null ? Math.max(0, 10 - Math.round(s.distance)) : 5) + (hasActivePaidPlan(p) ? 5 : 0))
      : null;

    return [
      {
        id: p.id,
        slug: p.slug,
        name: providerName(p),
        typeLabel: p.headline || PROVIDER_TYPE_LABEL[p.providerType],
        headline: p.headline,
        photo: p.photo,
        rating: rating ? Math.round(rating * 10) / 10 : null,
        reviewCount,
        distance: closest && center ? distanceMiles(center.lat, center.lng, closest.lat, closest.lng) : null,
        cityLabel: closest ? `${closest.cityName}, ${closest.state}` : p.city ? `${p.city.name}, ${p.city.stateCode}` : "",
        conditions: p.conditions.map((c) => c.name).slice(0, 3),
        insurances: p.insurances.map((i) => i.name).slice(0, 3),
        moreInsurances: Math.max(0, p.insurances.length - 3),
        licenseVerified: p.licenseVerified,
        claimed: p.claimStatus === "CLAIMED",
        isPaid: features.isPaid,
        featuredBadge: features.featuredBadge,
        telehealth: p.telehealth,
        acceptingNewPatients: p.acceptingNewPatients,
        matchPercent,
        whyMatches: why.slice(0, 3),
        hasPhone: !!p.phone,
        hasWebsite: !!p.website,
        location: closest
          ? { lat: closest.lat, lng: closest.lng, name: closest.name, address: `${closest.address}, ${closest.cityName}, ${closest.state} ${closest.zip}` }
          : null,
      },
    ];
  });

  return { results, total, page, pageSize, hasMore: page * pageSize < total, center, facets };
}
