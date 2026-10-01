/**
 * Provider CSV import / export engine (server only).
 * ------------------------------------------------------------------
 *   analyzeCsv(text, options)  → parse + validate, returns a preview
 *                                (what will be created/updated, row errors)
 *   importCsv(text, options)   → validate again, then write to the database
 *   exportCsv()                → all providers in the same format
 *   templateCsv()              → header + sample rows
 *
 * The column format lives in src/lib/providers-csv-columns.ts.
 */
import "server-only";
import Papa from "papaparse";
import type { ProviderType } from "@/db/schema";
import { db, t, eq, or, inArray, asc, desc, insertId, pluck } from "@/lib/db";
import { DAYS, DEFAULT_HOURS, parseHours, type OfficeHours } from "@/lib/hours";
import { slugify } from "@/lib/utils";
import { CSV_KEYS, PROVIDER_CSV_COLUMNS } from "@/lib/providers-csv-columns";

export type ImportOptions = {
  /** Create conditions / specialties / insurances that don't exist yet */
  createMissingTaxonomy: boolean;
  /** Create cities that don't exist yet (needs lat/lng in the row) */
  createMissingCities: boolean;
  /** Update providers that already exist (matched by slug, then email) */
  updateExisting: boolean;
};

type Row = Record<string, string>;

type LocationInput = {
  name: string | null;
  address: string;
  address2: string | null;
  city: string;
  stateCode: string;
  zip: string;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  rowNumber: number;
};

/** One provider (one or more CSV rows sharing a slug) */
type ProviderGroup = {
  key: string;
  rowNumber: number; // first row, for messages
  row: Row;
  locations: LocationInput[];
  existingId: number | null;
  existingSlug: string | null;
};

export type RowError = { row: number; message: string };

export type AnalyzeResult = {
  totalRows: number;
  providers: number;
  toCreate: number;
  toUpdate: number;
  skipped: number;
  locations: number;
  errors: RowError[];
  warnings: RowError[];
  unknownColumns: string[];
  missingColumns: string[];
  preview: { row: number; action: "create" | "update" | "skip"; name: string; slug: string; city: string; locations: number }[];
};

export type ImportResult = AnalyzeResult & { created: number; updated: number; failed: RowError[]; paths: string[] };

// ───────────────────────────── Parsing helpers ─────────────────────────────

const LIST_SEP = /\s*\|\s*/;
const list = (v: string | undefined) => (v ?? "").split(LIST_SEP).map((s) => s.trim()).filter(Boolean);
const text = (v: string | undefined) => {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
};
function yesNo(v: string | undefined): boolean | undefined {
  const t = (v ?? "").trim().toLowerCase();
  if (!t) return undefined;
  if (["yes", "y", "true", "1"].includes(t)) return true;
  if (["no", "n", "false", "0"].includes(t)) return false;
  throw new Error(`“${v}” is not yes/no`);
}
function num(v: string | undefined, label: string): number | null {
  const t = (v ?? "").trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) throw new Error(`${label} “${v}” is not a number`);
  return n;
}
function providerType(v: string | undefined): ProviderType | null {
  const t = (v ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (!t) return null;
  if (["pt", "physicaltherapist", "physicaltherapy", "physio", "dpt"].includes(t)) return "PHYSICAL_THERAPIST";
  if (["chiropractor", "chiro", "dc", "chiropractic"].includes(t)) return "CHIROPRACTOR";
  throw new Error(`provider_type “${v}” must be PT or Chiropractor`);
}
/** "mon=08:00-18:00;sat=09:00-13:00;sun=closed" → OfficeHours */
function officeHours(v: string | undefined): OfficeHours | null {
  const t = (v ?? "").trim();
  if (!t) return null;
  const hours: OfficeHours = Object.fromEntries(DAYS.map((d) => [d.key, { open: "", close: "", closed: true }]));
  for (const part of t.split(/\s*;\s*/).filter(Boolean)) {
    const m = part.match(/^([a-z]{3})[a-z]*\s*=\s*(closed|(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2}))$/i);
    if (!m) throw new Error(`office_hours part “${part}” should look like mon=08:00-18:00`);
    const day = m[1].toLowerCase();
    if (!(day in hours)) throw new Error(`office_hours day “${m[1]}” is not valid`);
    if (m[2].toLowerCase() === "closed") continue;
    const pad = (x: string) => x.padStart(5, "0");
    if (pad(m[3]) >= pad(m[4])) throw new Error(`office_hours for ${day}: opening must be before closing`);
    hours[day] = { open: pad(m[3]), close: pad(m[4]), closed: false };
  }
  return hours;
}
function url(v: string | undefined, label: string) {
  const t = text(v);
  if (!t) return null;
  if (t.startsWith("/")) return t; // media library path
  const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    return new URL(withProto).toString();
  } catch {
    throw new Error(`${label} “${v}” is not a valid link`);
  }
}

/** Parse CSV text (UTF-8, comma/semicolon/tab auto-detected) into rows with normalized headers */
function parse(textIn: string) {
  const result = Papa.parse<Row>(textIn.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"),
    transform: (v) => (typeof v === "string" ? v.trim() : v),
  });
  const headers = result.meta.fields ?? [];
  return { rows: result.data, headers, parseErrors: result.errors.map((e) => ({ row: (e.row ?? 0) + 2, message: e.message })) };
}

// ───────────────────────────── Lookups ─────────────────────────────

async function loadLookups() {
  const [conditions, specialties, insurances, cities, plans] = await Promise.all([
    db.select({ id: t.conditions.id, name: t.conditions.name, slug: t.conditions.slug }).from(t.conditions),
    db.select({ id: t.specialties.id, name: t.specialties.name, slug: t.specialties.slug }).from(t.specialties),
    db.select({ id: t.insurances.id, name: t.insurances.name, slug: t.insurances.slug }).from(t.insurances),
    db.select({ id: t.cities.id, name: t.cities.name, stateCode: t.cities.stateCode, slug: t.cities.slug, lat: t.cities.lat, lng: t.cities.lng }).from(t.cities),
    db.select({ id: t.plans.id, slug: t.plans.slug, name: t.plans.name }).from(t.plans),
  ]);
  // Look-up map that accepts the name, the slug, or the slugified name
  // ("Sports Injury" finds "Sports Injuries" / slug "sports-injury").
  const byNameOrSlug = <T extends { name: string; slug: string }>(items: T[]) => {
    const m = new Map<string, T>();
    for (const i of items) {
      m.set(i.name.toLowerCase(), i);
      m.set(i.slug.toLowerCase(), i);
      m.set(slugify(i.name), i);
    }
    return m;
  };
  return {
    conditions: byNameOrSlug(conditions),
    specialties: byNameOrSlug(specialties),
    insurances: byNameOrSlug(insurances),
    cities: new Map(cities.map((c) => [`${c.name.toLowerCase()}|${c.stateCode.toLowerCase()}`, c])),
    plans: new Map(plans.flatMap((p) => [[p.slug.toLowerCase(), p] as const, [p.name.toLowerCase(), p] as const])),
  };
}
type Lookups = Awaited<ReturnType<typeof loadLookups>>;

/** Find by name/slug, also trying singular/plural ("Headache" ↔ "Headaches") */
function findTaxonomy<T>(map: Map<string, T>, name: string): T | undefined {
  const n = name.toLowerCase().trim();
  const s = slugify(n);
  const variants = [n, s, s.replace(/ies$/, "y"), s.replace(/y$/, "ies"), s.replace(/s$/, ""), `${s}s`];
  for (const v of variants) {
    const hit = map.get(v);
    if (hit) return hit;
  }
  return undefined;
}

// ───────────────────────────── Analyze ─────────────────────────────

/** Group rows into providers and validate everything without writing. */
async function analyzeInternal(csvText: string, opts: ImportOptions) {
  const { rows, headers, parseErrors } = parse(csvText);
  const errors: RowError[] = [...parseErrors];
  const warnings: RowError[] = [];
  const unknownColumns = headers.filter((h) => h && !CSV_KEYS.includes(h));
  const missingColumns = PROVIDER_CSV_COLUMNS.filter((c) => c.required && !headers.includes(c.key)).map((c) => c.key);
  if (missingColumns.length && !headers.includes("slug")) {
    errors.push({ row: 1, message: `Missing required columns: ${missingColumns.join(", ")}` });
  }

  const lookups = await loadLookups();
  const groups = new Map<string, ProviderGroup>();

  // Existing providers by slug and by email (to decide create vs update)
  const slugs = [...new Set(rows.map((r) => r.slug?.toLowerCase()).filter(Boolean))] as string[];
  const emails = [...new Set(rows.map((r) => r.email?.toLowerCase()).filter(Boolean))] as string[];
  // MySQL's collation is case-insensitive, so IN (...) matches regardless of case
  const existing =
    slugs.length || emails.length
      ? await db
          .select({ id: t.providers.id, slug: t.providers.slug, email: t.providers.email })
          .from(t.providers)
          .where(or(inArray(t.providers.slug, slugs), inArray(t.providers.email, emails)))
      : [];
  const existingBySlug = new Map(existing.map((e) => [e.slug.toLowerCase(), e]));
  const existingByEmail = new Map(existing.filter((e) => e.email).map((e) => [e.email!.toLowerCase(), e]));

  rows.forEach((row, i) => {
    const rowNumber = i + 2; // +1 for header, +1 because spreadsheets start at 1
    const slug = row.slug?.toLowerCase().trim();
    const email = row.email?.toLowerCase().trim();
    // Rows without a slug are separate providers
    const key = slug || `__row${rowNumber}`;
    const location: LocationInput | null = row.address || row.city
      ? {
          name: text(row.location_name),
          address: row.address ?? "",
          address2: text(row.address2),
          city: row.city ?? "",
          stateCode: (row.state_code ?? "").toUpperCase(),
          zip: row.zip ?? "",
          lat: null,
          lng: null,
          phone: text(row.location_phone),
          rowNumber,
        }
      : null;
    try {
      if (location) {
        location.lat = num(row.lat, "lat");
        location.lng = num(row.lng, "lng");
        if (!location.address || !location.city || !location.stateCode || !location.zip) throw new Error("address, city, state_code and zip are all needed for a location");
        if ((location.lat == null) !== (location.lng == null)) throw new Error("fill both lat and lng, or neither");
        const city = lookups.cities.get(`${location.city.toLowerCase()}|${location.stateCode.toLowerCase()}`);
        if (!city) {
          if (!opts.createMissingCities) throw new Error(`city “${location.city}, ${location.stateCode}” is not in Admin → Cities`);
          if (location.lat == null) throw new Error(`city “${location.city}, ${location.stateCode}” is new – add lat/lng so it can be created`);
          warnings.push({ row: rowNumber, message: `New city “${location.city}, ${location.stateCode}” will be created` });
        }
      }
    } catch (e) {
      errors.push({ row: rowNumber, message: (e as Error).message });
      return;
    }

    const group = groups.get(key);
    if (group) {
      // Extra row for the same provider = extra location
      if (location) group.locations.push(location);
      else warnings.push({ row: rowNumber, message: "Repeated slug without address – row ignored" });
      return;
    }

    // First row of a provider: validate profile fields
    try {
      const match = (slug && existingBySlug.get(slug)) || (email && existingByEmail.get(email)) || null;
      if (match && !opts.updateExisting) {
        groups.set(key, { key, rowNumber, row, locations: [], existingId: match.id, existingSlug: match.slug });
        warnings.push({ row: rowNumber, message: `“${match.slug}” already exists – skipped (updating is turned off)` });
        return;
      }
      if (!match) {
        if (!row.first_name || !row.last_name) throw new Error("first_name and last_name are required for new providers");
        if (!providerType(row.provider_type)) throw new Error("provider_type is required for new providers (PT or Chiropractor)");
        if (!location) throw new Error("new providers need an address, city, state_code and zip");
      } else {
        providerType(row.provider_type); // validate if present
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`email “${row.email}” is not valid`);
      yesNo(row.license_verified);
      yesNo(row.accepting_new_patients);
      yesNo(row.in_person);
      yesNo(row.telehealth);
      yesNo(row.featured);
      num(row.years_experience, "years_experience");
      officeHours(row.office_hours);
      for (const k of ["website", "photo_url", "facebook_url", "x_url", "linkedin_url", "pinterest_url", "youtube_url", "instagram_url", "video_url"]) url(row[k], k);
      list(row.gallery_urls).forEach((g) => url(g, "gallery_urls"));
      if (row.claim_status && !["UNCLAIMED", "CLAIMED", "PENDING"].includes(row.claim_status.toUpperCase())) throw new Error(`claim_status “${row.claim_status}” must be UNCLAIMED, CLAIMED or PENDING`);
      if (row.status && !["ACTIVE", "INACTIVE"].includes(row.status.toUpperCase())) throw new Error(`status “${row.status}” must be ACTIVE or INACTIVE`);
      if (row.plan && !lookups.plans.get(row.plan.toLowerCase())) throw new Error(`plan “${row.plan}” doesn't exist (see Admin → Plans)`);
      if (row.plan_expires && Number.isNaN(Date.parse(row.plan_expires))) throw new Error(`plan_expires “${row.plan_expires}” should be YYYY-MM-DD`);
      for (const [col, map, label] of [
        ["conditions", lookups.conditions, "condition"],
        ["specialties", lookups.specialties, "specialty"],
        ["insurances", lookups.insurances, "insurance"],
      ] as const) {
        const unknown = list(row[col]).filter((n) => !findTaxonomy(map, n));
        if (unknown.length) {
          if (!opts.createMissingTaxonomy) throw new Error(`unknown ${label}: ${unknown.join(", ")}`);
          warnings.push({ row: rowNumber, message: `New ${label} will be created: ${unknown.join(", ")}` });
        }
      }
      groups.set(key, { key, rowNumber, row, locations: location ? [location] : [], existingId: match?.id ?? null, existingSlug: match?.slug ?? null });
    } catch (e) {
      errors.push({ row: rowNumber, message: (e as Error).message });
    }
  });

  const list_ = [...groups.values()];
  const skippedGroups = list_.filter((g) => g.existingId && !opts.updateExisting);
  const valid = list_.filter((g) => !skippedGroups.includes(g));
  const result: AnalyzeResult = {
    totalRows: rows.length,
    providers: list_.length,
    toCreate: valid.filter((g) => !g.existingId).length,
    toUpdate: valid.filter((g) => g.existingId).length,
    skipped: skippedGroups.length,
    locations: valid.reduce((n, g) => n + g.locations.length, 0),
    errors: errors.sort((a, b) => a.row - b.row),
    warnings,
    unknownColumns,
    missingColumns,
    preview: list_.slice(0, 50).map((g) => ({
      row: g.rowNumber,
      action: skippedGroups.includes(g) ? "skip" : g.existingId ? "update" : "create",
      name: [g.row.prefix, g.row.first_name, g.row.last_name].filter(Boolean).join(" ") || g.existingSlug || "",
      slug: g.existingSlug ?? (g.row.slug || "(auto)"),
      city: g.locations[0] ? `${g.locations[0].city}, ${g.locations[0].stateCode}` : "",
      locations: g.locations.length,
    })),
  };
  return { result, groups: valid, lookups };
}

export async function analyzeCsv(csvText: string, opts: ImportOptions) {
  return (await analyzeInternal(csvText, opts)).result;
}

// ───────────────────────────── Import ─────────────────────────────

async function uniqueSlug(base: string, taken: Set<string>) {
  const root = slugify(base) || "provider";
  let s = root;
  for (let i = 2; taken.has(s) || (await db.query.providers.findFirst({ where: eq(t.providers.slug, s), columns: { id: true } })); i++) s = `${root}-${i}`;
  taken.add(s);
  return s;
}

/** Taxonomy table for each kind (all three have id / name / slug) */
const TAXONOMY_TABLES = { condition: t.conditions, specialty: t.specialties, insurance: t.insurances } as const;

/** Find taxonomy ids by name/slug, creating missing ones when allowed */
async function taxonomyIds(kind: "condition" | "specialty" | "insurance", names: string[], lookups: Lookups, create: boolean) {
  const map = kind === "condition" ? lookups.conditions : kind === "specialty" ? lookups.specialties : lookups.insurances;
  const ids: number[] = [];
  for (const n of names) {
    let item = findTaxonomy(map, n);
    if (!item && create) {
      const data = { name: n, slug: slugify(n) };
      const table = TAXONOMY_TABLES[kind];
      // "Upsert" by slug: insert, or leave the existing row untouched (no-op update), then read it back
      if (kind === "condition") {
        await db.insert(t.conditions).values({ ...data, showOnHome: false }).onDuplicateKeyUpdate({ set: { slug: data.slug } });
      } else {
        await db.insert(table).values(data).onDuplicateKeyUpdate({ set: { slug: data.slug } });
      }
      const [row] = await db.select({ id: table.id, name: table.name, slug: table.slug }).from(table).where(eq(table.slug, data.slug)).limit(1);
      if (!row) throw new Error(`could not create ${kind} “${n}”`);
      item = row;
      map.set(n.toLowerCase(), item);
      map.set(item.slug, item);
    }
    if (item) ids.push(item.id);
  }
  return [...new Set(ids)];
}

async function cityFor(loc: LocationInput, lookups: Lookups, create: boolean) {
  const key = `${loc.city.toLowerCase()}|${loc.stateCode.toLowerCase()}`;
  let city = lookups.cities.get(key);
  if (!city && create && loc.lat != null && loc.lng != null) {
    const slug = slugify(`${loc.city}-${loc.stateCode}`);
    // "Upsert" by slug: insert, or keep the existing city (no-op update), then read it back
    await db
      .insert(t.cities)
      .values({ name: loc.city, state: loc.stateCode, stateCode: loc.stateCode, slug, lat: loc.lat, lng: loc.lng, zipCodes: loc.zip })
      .onDuplicateKeyUpdate({ set: { slug } });
    [city] = await db
      .select({ id: t.cities.id, name: t.cities.name, stateCode: t.cities.stateCode, slug: t.cities.slug, lat: t.cities.lat, lng: t.cities.lng })
      .from(t.cities)
      .where(eq(t.cities.slug, slug))
      .limit(1);
    if (city) lookups.cities.set(key, city);
  }
  if (!city) throw new Error(`city “${loc.city}, ${loc.stateCode}” not found`);
  return city;
}

export async function importCsv(csvText: string, opts: ImportOptions): Promise<ImportResult> {
  const { result, groups, lookups } = await analyzeInternal(csvText, opts);
  const failed: RowError[] = [];
  const paths: string[] = [];
  const takenSlugs = new Set<string>();
  let created = 0;
  let updated = 0;

  for (const g of groups) {
    const r = g.row;
    try {
      const type = providerType(r.provider_type);
      const hours = officeHours(r.office_hours);
      const plan = r.plan ? lookups.plans.get(r.plan.toLowerCase()) : undefined;
      const [conditionIds, specialtyIds, insuranceIds] = await Promise.all([
        taxonomyIds("condition", list(r.conditions), lookups, opts.createMissingTaxonomy),
        taxonomyIds("specialty", list(r.specialties), lookups, opts.createMissingTaxonomy),
        taxonomyIds("insurance", list(r.insurances), lookups, opts.createMissingTaxonomy),
      ]);
      const cities = await Promise.all(g.locations.map((l) => cityFor(l, lookups, opts.createMissingCities)));
      const claim = text(r.claim_status)?.toUpperCase() as "UNCLAIMED" | "CLAIMED" | "PENDING" | undefined;

      // Only fields with a value in the CSV are written (empty cells keep existing data)
      const fields: Record<string, unknown> = {
        prefix: text(r.prefix),
        firstName: text(r.first_name),
        lastName: text(r.last_name),
        credentials: text(r.credentials),
        providerType: type,
        headline: text(r.headline),
        practiceName: text(r.practice_name),
        bio: text(r.bio),
        quote: text(r.quote),
        gender: text(r.gender),
        languages: list(r.languages).join(", ") || null,
        education: text(r.education),
        yearsExperience: num(r.years_experience, "years_experience"),
        photo: url(r.photo_url, "photo_url"),
        email: text(r.email)?.toLowerCase() ?? null,
        phone: text(r.phone),
        website: url(r.website, "website"),
        licenseNumber: text(r.license_number),
        licenseState: text(r.license_state)?.toUpperCase() ?? null,
        licenseVerified: yesNo(r.license_verified),
        acceptingNewPatients: yesNo(r.accepting_new_patients),
        inPerson: yesNo(r.in_person),
        telehealth: yesNo(r.telehealth),
        officeHours: hours,
        claimStatus: claim,
        claimedAt: claim === "CLAIMED" ? new Date() : undefined,
        planId: plan?.id,
        planExpiresAt: r.plan_expires ? new Date(`${r.plan_expires}T23:59:59.000Z`) : undefined,
        featured: yesNo(r.featured),
        status: text(r.status) ? (r.status.toUpperCase() as "ACTIVE" | "INACTIVE") : undefined,
        facebookUrl: url(r.facebook_url, "facebook_url"),
        xUrl: url(r.x_url, "x_url"),
        linkedinUrl: url(r.linkedin_url, "linkedin_url"),
        pinterestUrl: url(r.pinterest_url, "pinterest_url"),
        youtubeUrl: url(r.youtube_url, "youtube_url"),
        instagramUrl: url(r.instagram_url, "instagram_url"),
        videoUrl: url(r.video_url, "video_url"),
        metaTitle: text(r.meta_title),
        metaDescription: text(r.meta_description),
        metaKeywords: text(r.meta_keywords),
        cityId: cities[0]?.id,
      };
      const data = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null && v !== undefined));
      const gallery = list(r.gallery_urls).map((u) => url(u, "gallery_urls")!);
      const locationRows = g.locations.map((l, i) => ({
        name: l.name || text(r.practice_name) || `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || "Main office",
        address: l.address,
        address2: l.address2,
        cityId: cities[i].id,
        cityName: cities[i].name,
        state: cities[i].stateCode,
        zip: l.zip,
        lat: l.lat ?? cities[i].lat,
        lng: l.lng ?? cities[i].lng,
        phone: l.phone,
        isPrimary: i === 0,
        sortOrder: i,
      }));

      let slug: string;
      // One transaction per provider: profile, links, locations and gallery succeed or fail together
      await db.transaction(async (tx) => {
        let providerId: number;
        let galleryAltName: string;
        if (g.existingId) {
          // ---- Update ----
          providerId = g.existingId;
          if (Object.keys(data).length) {
            await tx.update(t.providers).set(data as Partial<typeof t.providers.$inferInsert>).where(eq(t.providers.id, providerId));
          }
          const p = await tx.query.providers.findFirst({
            where: eq(t.providers.id, providerId),
            columns: { slug: true, practiceName: true, lastName: true },
          });
          if (!p) throw new Error("provider not found");
          slug = p.slug;
          galleryAltName = p.practiceName ?? p.lastName;
          // Filled taxonomy columns replace the provider's links (empty = keep)
          if (conditionIds.length) {
            await tx.delete(t.providerConditions).where(eq(t.providerConditions.providerId, providerId));
            await tx.insert(t.providerConditions).values(conditionIds.map((conditionId) => ({ providerId, conditionId })));
          }
          if (specialtyIds.length) {
            await tx.delete(t.providerSpecialties).where(eq(t.providerSpecialties.providerId, providerId));
            await tx.insert(t.providerSpecialties).values(specialtyIds.map((specialtyId) => ({ providerId, specialtyId })));
          }
          if (insuranceIds.length) {
            await tx.delete(t.providerInsurances).where(eq(t.providerInsurances.providerId, providerId));
            await tx.insert(t.providerInsurances).values(insuranceIds.map((insuranceId) => ({ providerId, insuranceId })));
          }
          // Locations / gallery in the CSV replace the existing ones
          if (locationRows.length) await tx.delete(t.providerLocations).where(eq(t.providerLocations.providerId, providerId));
          if (gallery.length) await tx.delete(t.galleryImages).where(eq(t.galleryImages.providerId, providerId));
        } else {
          // ---- Create ----
          slug = r.slug ? await uniqueSlug(r.slug, takenSlugs) : await uniqueSlug(`dr ${r.first_name} ${r.last_name} ${cities[0]?.name ?? ""}`, takenSlugs);
          providerId = await insertId(
            tx.insert(t.providers).values({
              ...(data as Partial<typeof t.providers.$inferInsert>),
              slug,
              firstName: r.first_name,
              lastName: r.last_name,
              providerType: type!,
              headline: text(r.headline) ?? (type === "CHIROPRACTOR" ? "Chiropractor" : "Physical Therapist"),
              officeHours: hours ?? DEFAULT_HOURS,
            }),
          );
          galleryAltName = text(r.practice_name) ?? r.last_name;
          // Many-to-many links (never insert an empty list)
          if (conditionIds.length) await tx.insert(t.providerConditions).values(conditionIds.map((conditionId) => ({ providerId, conditionId })));
          if (specialtyIds.length) await tx.insert(t.providerSpecialties).values(specialtyIds.map((specialtyId) => ({ providerId, specialtyId })));
          if (insuranceIds.length) await tx.insert(t.providerInsurances).values(insuranceIds.map((insuranceId) => ({ providerId, insuranceId })));
        }
        if (locationRows.length) await tx.insert(t.providerLocations).values(locationRows.map((l) => ({ ...l, providerId })));
        if (gallery.length) {
          await tx.insert(t.galleryImages).values(gallery.map((u, i) => ({ providerId, url: u, alt: `${galleryAltName} clinic photo ${i + 1}`, sortOrder: i })));
        }
      });
      paths.push(`/provider/${slug!}`);
      if (g.existingId) updated++;
      else created++;
    } catch (e) {
      failed.push({ row: g.rowNumber, message: (e as Error).message.split("\n").pop() ?? "failed" });
    }
  }
  return { ...result, created, updated, failed, paths };
}

// ───────────────────────────── Export & template ─────────────────────────────

const yes = (b: boolean | null | undefined) => (b ? "yes" : "no");
function hoursToText(value: unknown) {
  const h = parseHours(value);
  return DAYS.map((d) => `${d.key}=${h[d.key].closed ? "closed" : `${h[d.key].open}-${h[d.key].close}`}`).join(";");
}

/** Every provider in import format – one row per location */
export async function exportCsv() {
  const providers = await db.query.providers.findMany({
    orderBy: [asc(t.providers.id)],
    with: {
      plan: { columns: { slug: true } },
      // many-to-many → join rows, flattened with pluck() below
      conditions: { with: { condition: { columns: { name: true } } } },
      specialties: { with: { specialty: { columns: { name: true } } } },
      insurances: { with: { insurance: { columns: { name: true } } } },
      locations: { orderBy: [desc(t.providerLocations.isPrimary), asc(t.providerLocations.sortOrder)] },
      gallery: { orderBy: [asc(t.galleryImages.sortOrder)], columns: { url: true } },
    },
  });
  const rows: Record<string, string>[] = [];
  for (const p of providers) {
    const base: Record<string, string> = {
      slug: p.slug,
      prefix: p.prefix ?? "",
      first_name: p.firstName,
      last_name: p.lastName,
      credentials: p.credentials ?? "",
      provider_type: p.providerType === "CHIROPRACTOR" ? "Chiropractor" : "PT",
      headline: p.headline ?? "",
      practice_name: p.practiceName ?? "",
      bio: p.bio ?? "",
      quote: p.quote ?? "",
      gender: p.gender ?? "",
      languages: (p.languages ?? "").split(/\s*,\s*/).filter(Boolean).join("|"),
      education: p.education ?? "",
      years_experience: p.yearsExperience?.toString() ?? "",
      photo_url: p.photo ?? "",
      gallery_urls: p.gallery.map((g) => g.url).join("|"),
      email: p.email ?? "",
      phone: p.phone ?? "",
      website: p.website ?? "",
      license_number: p.licenseNumber ?? "",
      license_state: p.licenseState ?? "",
      license_verified: yes(p.licenseVerified),
      conditions: pluck(p.conditions, "condition").map((c) => c.name).join("|"),
      specialties: pluck(p.specialties, "specialty").map((c) => c.name).join("|"),
      insurances: pluck(p.insurances, "insurance").map((c) => c.name).join("|"),
      accepting_new_patients: yes(p.acceptingNewPatients),
      in_person: yes(p.inPerson),
      telehealth: yes(p.telehealth),
      office_hours: hoursToText(p.officeHours),
      claim_status: p.claimStatus,
      plan: p.plan?.slug ?? "",
      plan_expires: p.planExpiresAt ? p.planExpiresAt.toISOString().slice(0, 10) : "",
      featured: yes(p.featured),
      status: p.status,
      facebook_url: p.facebookUrl ?? "",
      x_url: p.xUrl ?? "",
      linkedin_url: p.linkedinUrl ?? "",
      pinterest_url: p.pinterestUrl ?? "",
      youtube_url: p.youtubeUrl ?? "",
      instagram_url: p.instagramUrl ?? "",
      video_url: p.videoUrl ?? "",
      meta_title: p.metaTitle ?? "",
      meta_description: p.metaDescription ?? "",
      meta_keywords: p.metaKeywords ?? "",
    };
    const locs = p.locations.length ? p.locations : [null];
    locs.forEach((l, i) => {
      const loc: Record<string, string> = l
        ? { location_name: l.name, address: l.address, address2: l.address2 ?? "", city: l.cityName, state_code: l.state, zip: l.zip, lat: String(l.lat), lng: String(l.lng), location_phone: l.phone ?? "" }
        : {};
      // Extra locations only repeat the slug + location columns
      rows.push(i === 0 ? { ...base, ...loc } : { slug: p.slug, ...loc });
    });
  }
  return toCsv(rows);
}

/** Header + ready-to-edit sample rows */
export function templateCsv() {
  const sample1 = Object.fromEntries(PROVIDER_CSV_COLUMNS.map((c) => [c.key, c.example]));
  sample1.slug = "";
  const sample2: Record<string, string> = {
    first_name: "Jordan", last_name: "Blake", prefix: "Dr.", credentials: "DC", provider_type: "Chiropractor", practice_name: "Align Chiropractic Denver",
    email: "jordan.blake@alignchiro.example.com", phone: "(303) 555-0110", website: "https://www.alignchiro.example.com", bio: "Chiropractor focused on spine health, headaches and sports injuries.",
    conditions: "Back Pain|Neck Pain|Headaches", specialties: "Spinal Adjustments|Chiropractic Care", insurances: "Aetna|Cigna|Self-Pay / Out-of-Network",
    license_number: "CO-778812", license_state: "CO", license_verified: "no", accepting_new_patients: "yes", telehealth: "no",
    office_hours: "mon=09:00-18:00;wed=09:00-18:00;fri=09:00-15:00", address: "250 Larimer St", city: "Denver", state_code: "CO", zip: "80202", claim_status: "UNCLAIMED",
  };
  // A provider with two locations: repeat the slug on the second row
  const sample3: Record<string, string> = {
    slug: "dr-priya-raman-seattle", first_name: "Priya", last_name: "Raman", prefix: "Dr.", credentials: "DPT", provider_type: "PT", practice_name: "Summit Physical Therapy",
    email: "priya.raman@summitpt.example.com", conditions: "Knee Pain|Sports Injuries|Post-Surgical Rehabilitation", specialties: "Sports Physical Therapy|Post-Surgery Rehab", insurances: "Medicare|UnitedHealthcare",
    location_name: "Summit PT – Capitol Hill", address: "1500 Broadway", city: "Seattle", state_code: "WA", zip: "98122", lat: "47.6155", lng: "-122.3207", claim_status: "CLAIMED", plan: "pro",
  };
  const sample3b: Record<string, string> = { slug: "dr-priya-raman-seattle", location_name: "Summit PT – Ballard", address: "5300 Ballard Ave NW", city: "Seattle", state_code: "WA", zip: "98107", lat: "47.6677", lng: "-122.3843" };
  return toCsv([sample1, sample2, sample3, sample3b]);
}

function toCsv(rows: Record<string, string>[]) {
  // UTF-8 BOM so Excel opens accents / symbols correctly
  return "﻿" + Papa.unparse({ fields: CSV_KEYS, data: rows.map((r) => CSV_KEYS.map((k) => r[k] ?? "")) }, { newline: "\r\n" });
}
