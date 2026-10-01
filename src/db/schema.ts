/**
 * =====================================================================
 *  RangeDoc – Drizzle ORM data model (MySQL)
 * ---------------------------------------------------------------------
 *  Every table of the site is declared here with `drizzle-orm/mysql-core`.
 *
 *  - Property names are camelCase in TypeScript (provider.firstName) and
 *    are stored as snake_case columns in MySQL (first_name). This is done
 *    automatically by `casing: "snake_case"` in src/lib/db.ts and
 *    drizzle.config.ts, so columns don't need a name here.
 *  - Money is stored as integer cents (priceCents) – no rounding errors.
 *  - Dates are DATETIME(3) in UTC. `createdAt` / `updatedAt` are filled by
 *    the app ($defaultFn / $onUpdateFn) so they are always UTC.
 *  - Many-to-many links (provider ↔ conditions, post ↔ tags…) use small
 *    join tables with a composite primary key.
 *  - Relations for `db.query.*` (the relational query API) live in
 *    src/db/relations.ts.
 *
 *  Change this file → run `npm run db:generate` (creates a SQL migration
 *  in /drizzle) → `npm run db:migrate` (applies it). For quick local
 *  experiments `npm run db:push` syncs the tables directly.
 * =====================================================================
 */
import {
  boolean,
  customType,
  date,
  datetime,
  double,
  index,
  int,
  longtext,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

// ─────────────────────────────── Helpers ───────────────────────────────

/** Default length for short strings (fits a utf8mb4 unique index) */
const str = (length = 191) => varchar({ length });

/**
 * JSON column that also works on MariaDB (where JSON is stored as text and
 * the driver returns a string): strings are parsed back into objects.
 */
const json = customType<{ data: unknown; driverData: string }>({
  dataType: () => "json",
  toDriver: (value) => JSON.stringify(value),
  fromDriver: (value) => (typeof value === "string" ? JSON.parse(value) : value),
});

/** DATETIME(3) stored in UTC */
const dt = () => datetime({ mode: "date", fsp: 3 });
/** Row creation time (set by the app on insert) */
const createdAt = () => dt().notNull().$defaultFn(() => new Date());
/** Row update time (set on insert and on every update) */
const updatedAt = () =>
  dt()
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date());
/** Auto-increment primary key */
const id = () => int().autoincrement().primaryKey();

/** Standard SEO columns used by every public content type */
const seo = () => ({
  metaTitle: str(255),
  metaDescription: str(500),
  metaKeywords: str(500),
  ogImage: str(),
});

// ─────────────────────────────── Enums ────────────────────────────────
// The value lists are exported so forms, filters and validation can use them.

export const ROLES = ["ADMIN", "PROVIDER"] as const;
export const PROVIDER_TYPES = ["PHYSICAL_THERAPIST", "CHIROPRACTOR"] as const;
/**
 * UNCLAIMED = listed by us (free, lowest search priority)
 * PENDING   = someone registered to claim it; admin must verify
 * CLAIMED   = verified owner controls the profile
 */
export const CLAIM_STATUSES = ["UNCLAIMED", "PENDING", "CLAIMED"] as const;
export const PROVIDER_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export const MODERATION_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export const APPOINTMENT_STATUSES = ["NEW", "CONFIRMED", "CANCELLED", "COMPLETED"] as const;
export const ORDER_STATUSES = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED", "REFUNDED", "FAILED"] as const;
export const PLAN_INTERVALS = ["MONTH", "YEAR", "LIFETIME"] as const;
/** Every trackable visitor interaction */
export const EVENT_TYPES = [
  "PAGE_VIEW",
  "SEARCH",
  "SEARCH_IMPRESSION",
  "SEARCH_CLICK",
  "PROFILE_VIEW",
  "APPOINTMENT_CLICK",
  "APPOINTMENT_SUBMIT",
  "CALL_CLICK",
  "EMAIL_CLICK",
  "EMAIL_SUBMIT",
  "WEBSITE_CLICK",
  "GALLERY_VIEW",
  "PHOTO_VIEW",
  "SHARE_CLICK",
  "SAVE_CLICK",
  "DIRECTIONS_CLICK",
  "PRODUCT_VIEW",
  "ADD_TO_CART",
  "BLOG_VIEW",
] as const;

export type Role = (typeof ROLES)[number];
export type ProviderType = (typeof PROVIDER_TYPES)[number];
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];
export type ProviderStatus = (typeof PROVIDER_STATUSES)[number];
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PlanInterval = (typeof PLAN_INTERVALS)[number];
export type EventType = (typeof EVENT_TYPES)[number];

/** Office hours JSON: { mon: { open: "08:00", close: "18:00", closed: false }, … } */
export type OfficeHours = Record<string, { open?: string; close?: string; closed?: boolean }>;

// ─────────────────────────────── Users ────────────────────────────────

export const users = mysqlTable("users", {
  id: id(),
  name: str().notNull(),
  email: str().notNull().unique(),
  passwordHash: str().notNull(),
  role: mysqlEnum(ROLES).notNull().default("PROVIDER"),
  avatar: str(),
  /** A provider account manages exactly one provider profile */
  providerId: int()
    .unique()
    .references(() => providers.id, { onDelete: "set null" }),
  /** Social login ids (admin "Sign in with Google / Facebook") */
  googleId: str().unique(),
  facebookId: str().unique(),
  resetToken: str().unique(),
  resetTokenExpires: dt(),
  lastLoginAt: dt(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ───────────────────────────── Providers ──────────────────────────────

export const providers = mysqlTable(
  "providers",
  {
    id: id(),
    slug: str().notNull().unique(),
    prefix: str(20), // "Dr."
    firstName: str().notNull(),
    lastName: str().notNull(),
    credentials: str(80), // "PT, DPT"
    providerType: mysqlEnum(PROVIDER_TYPES).notNull(),
    headline: str(160), // "Physical Therapist"
    practiceName: str(),
    bio: text(),
    quote: str(500),
    bestMatch: text(), // "Best match for you" paragraph
    bestMatchPoints: text(), // one bullet per line
    photo: str(),
    videoUrl: str(), // intro video (paid plans)
    // Social network links (paid plans)
    facebookUrl: str(),
    xUrl: str(),
    linkedinUrl: str(),
    pinterestUrl: str(),
    youtubeUrl: str(),
    instagramUrl: str(),
    gender: str(30),
    languages: str(255), // comma separated
    education: str(),
    yearsExperience: int(),
    licenseNumber: str(80),
    licenseState: str(40),
    licenseVerified: boolean().notNull().default(false),
    claimStatus: mysqlEnum(CLAIM_STATUSES).notNull().default("UNCLAIMED"),
    claimNote: text(),
    claimedAt: dt(),
    status: mysqlEnum(PROVIDER_STATUSES).notNull().default("ACTIVE"),
    phone: str(40),
    email: str(),
    website: str(),
    acceptingNewPatients: boolean().notNull().default(true),
    inPerson: boolean().notNull().default(true),
    telehealth: boolean().notNull().default(false),
    responseTime: str(120),
    officeHours: json().$type<OfficeHours | null>(),
    slotMinutes: int().notNull().default(30),
    /** Rating the provider chooses to display (paid plans), e.g. their Google rating */
    displayRating: double(),
    displayReviewCount: int(),
    ratingSource: str(60),
    endorsement: str(255), // "Recommended by 12+ referring physicians"
    featured: boolean().notNull().default(false), // shown in "Featured Providers" on home
    featuredOrder: int().notNull().default(0),
    planId: int().references(() => plans.id, { onDelete: "set null" }),
    planExpiresAt: dt(),
    cityId: int().references(() => cities.id, { onDelete: "set null" }),
    ...seo(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("providers_provider_type_idx").on(t.providerType),
    index("providers_city_id_idx").on(t.cityId),
    index("providers_claim_status_idx").on(t.claimStatus),
    index("providers_featured_idx").on(t.featured),
  ],
);

export const providerLocations = mysqlTable(
  "provider_locations",
  {
    id: id(),
    providerId: int()
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    name: str().notNull(), // "MotionNear Austin"
    address: str().notNull(),
    address2: str(),
    cityId: int().references(() => cities.id, { onDelete: "set null" }),
    cityName: str().notNull(),
    state: str(40).notNull(),
    zip: str(20).notNull(),
    lat: double().notNull(),
    lng: double().notNull(),
    phone: str(40),
    isPrimary: boolean().notNull().default(false),
    sortOrder: int().notNull().default(0),
  },
  (t) => [index("provider_locations_provider_id_idx").on(t.providerId), index("provider_locations_lat_lng_idx").on(t.lat, t.lng)],
);

export const galleryImages = mysqlTable(
  "gallery_images",
  {
    id: id(),
    providerId: int()
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    url: str().notNull(),
    alt: str(),
    sortOrder: int().notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("gallery_images_provider_id_idx").on(t.providerId)],
);

/** Video gallery (paid plans) – YouTube/Vimeo links or uploaded MP4/WebM files */
export const providerVideos = mysqlTable(
  "provider_videos",
  {
    id: id(),
    providerId: int()
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    title: str().notNull(),
    url: str().notNull(),
    thumbnail: str(),
    sortOrder: int().notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("provider_videos_provider_id_idx").on(t.providerId)],
);

export const providerFaqs = mysqlTable(
  "provider_faqs",
  {
    id: id(),
    providerId: int()
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    question: str(500).notNull(),
    answer: text().notNull(),
    sortOrder: int().notNull().default(0),
  },
  (t) => [index("provider_faqs_provider_id_idx").on(t.providerId)],
);

export const reviews = mysqlTable(
  "reviews",
  {
    id: id(),
    providerId: int()
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    authorName: str().notNull(),
    authorEmail: str(),
    rating: int().notNull(),
    title: str(),
    body: text().notNull(),
    status: mysqlEnum(MODERATION_STATUSES).notNull().default("PENDING"),
    visitorId: str(64),
    createdAt: createdAt(),
  },
  (t) => [index("reviews_provider_id_status_idx").on(t.providerId, t.status)],
);

export const appointmentRequests = mysqlTable(
  "appointment_requests",
  {
    id: id(),
    providerId: int()
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    locationId: int(),
    date: date({ mode: "date" }).notNull(),
    timeSlot: str(20).notNull(), // "09:30"
    firstName: str().notNull(),
    lastName: str().notNull(),
    email: str().notNull(),
    phone: str(40).notNull(),
    dateOfBirth: str(20),
    isNewPatient: boolean().notNull().default(true),
    insurance: str(),
    reason: text(),
    preferredContact: str(20),
    status: mysqlEnum(APPOINTMENT_STATUSES).notNull().default("NEW"),
    providerNote: text(),
    visitorId: str(64),
    createdAt: createdAt(),
  },
  (t) => [index("appointment_requests_provider_id_date_idx").on(t.providerId, t.date)],
);

/** "Email provider" messages – shown in the provider dashboard inbox */
export const providerMessages = mysqlTable(
  "provider_messages",
  {
    id: id(),
    providerId: int()
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    name: str().notNull(),
    contact: str().notNull(), // email or phone typed by the visitor
    subject: str().notNull(),
    message: text().notNull(),
    read: boolean().notNull().default(false),
    visitorId: str(64),
    createdAt: createdAt(),
  },
  (t) => [index("provider_messages_provider_id_created_at_idx").on(t.providerId, t.createdAt)],
);

// ──────────────────────── Plans / claim pricing ───────────────────────

export const plans = mysqlTable("plans", {
  id: id(),
  name: str().notNull(),
  slug: str().notNull().unique(),
  tagline: str(),
  priceCents: int().notNull().default(0),
  interval: mysqlEnum(PLAN_INTERVALS).notNull().default("MONTH"),
  isFree: boolean().notNull().default(false),
  isPopular: boolean().notNull().default(false),
  badge: str(40),
  priceNote: str(60), // "Always free" / "Cancel anytime"
  ctaLabel: str(60),
  /** Feature bullet list shown on the pricing card */
  features: json().$type<string[] | null>(),
  // ---- Capabilities unlocked by this plan ----
  maxPhotos: int().notNull().default(4),
  maxLocations: int().notNull().default(1),
  maxFaqs: int().notNull().default(3),
  allowReviews: boolean().notNull().default(false), // visitors can post reviews / reviews shown
  allowShareSave: boolean().notNull().default(false), // share + save buttons on profile
  allowRatingDisplay: boolean().notNull().default(false), // provider-set rating is shown
  allowVideo: boolean().notNull().default(false), // intro video
  maxVideos: int().notNull().default(0), // video gallery size
  allowSocialLinks: boolean().notNull().default(false), // Facebook, X, LinkedIn, Pinterest, YouTube…
  allowAnalytics: boolean().notNull().default(false), // full analytics in dashboard
  allowAllFaqs: boolean().notNull().default(false), // "View all FAQs"
  featuredBadge: boolean().notNull().default(false),
  /** Higher = shown earlier in search results among paid providers */
  searchPriority: int().notNull().default(0),
  active: boolean().notNull().default(true),
  sortOrder: int().notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const planOrders = mysqlTable("plan_orders", {
  id: id(),
  orderNumber: str().notNull().unique(),
  providerId: int().references(() => providers.id, { onDelete: "set null" }),
  userId: int(),
  planId: int()
    .notNull()
    .references(() => plans.id),
  amountCents: int().notNull(),
  currency: str(8).notNull().default("USD"),
  status: mysqlEnum(ORDER_STATUSES).notNull().default("PENDING"),
  paymentMethod: str(30).notNull(),
  paymentRef: str(),
  billingName: str().notNull(),
  billingEmail: str().notNull(),
  billingPhone: str(40),
  billingAddress: str(),
  paidAt: dt(),
  createdAt: createdAt(),
});

// ─────────────────────── Taxonomy / directory ─────────────────────────

export const cities = mysqlTable("cities", {
  id: id(),
  name: str().notNull(),
  state: str().notNull(),
  stateCode: str(10).notNull(),
  slug: str().notNull().unique(),
  lat: double().notNull(),
  lng: double().notNull(),
  zipCodes: text(), // comma separated
  image: str(),
  description: text(),
  featured: boolean().notNull().default(false), // "Find Care Near You" on home
  sortOrder: int().notNull().default(0),
  active: boolean().notNull().default(true),
  ...seo(),
});

/** Pain areas / conditions ("Where does it hurt?") */
export const conditions = mysqlTable("conditions", {
  id: id(),
  name: str().notNull(),
  slug: str().notNull().unique(),
  shortName: str(60),
  description: text(),
  image: str(),
  keywords: text(), // extra search synonyms, comma separated
  showOnHome: boolean().notNull().default(true),
  sortOrder: int().notNull().default(0),
  active: boolean().notNull().default(true),
  ...seo(),
});

/** Treatments / specialties (Manual Therapy, Sports Rehab…) */
export const specialties = mysqlTable("specialties", {
  id: id(),
  name: str().notNull(),
  slug: str().notNull().unique(),
  description: text(),
  sortOrder: int().notNull().default(0),
});

export const insurances = mysqlTable("insurances", {
  id: id(),
  name: str().notNull(),
  slug: str().notNull().unique(),
  logo: str(),
  sortOrder: int().notNull().default(0),
});

// Many-to-many join tables: provider ↔ condition / specialty / insurance
export const providerConditions = mysqlTable(
  "provider_conditions",
  {
    providerId: int()
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    conditionId: int()
      .notNull()
      .references(() => conditions.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.providerId, t.conditionId] }), index("provider_conditions_condition_id_idx").on(t.conditionId)],
);

export const providerSpecialties = mysqlTable(
  "provider_specialties",
  {
    providerId: int()
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    specialtyId: int()
      .notNull()
      .references(() => specialties.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.providerId, t.specialtyId] }), index("provider_specialties_specialty_id_idx").on(t.specialtyId)],
);

export const providerInsurances = mysqlTable(
  "provider_insurances",
  {
    providerId: int()
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    insuranceId: int()
      .notNull()
      .references(() => insurances.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.providerId, t.insuranceId] }), index("provider_insurances_insurance_id_idx").on(t.insuranceId)],
);

/** "Popular ways to find care" chips on the home page */
export const popularSearches = mysqlTable("popular_searches", {
  id: id(),
  label: str().notNull(),
  providerType: mysqlEnum(PROVIDER_TYPES),
  conditionId: int().references(() => conditions.id, { onDelete: "set null" }),
  specialtyId: int().references(() => specialties.id, { onDelete: "set null" }),
  query: str(),
  sortOrder: int().notNull().default(0),
  active: boolean().notNull().default(true),
});

/**
 * Small admin-editable content items grouped by `section`
 * (home stats, hero badges, claim steps, why-claim items, product tips…)
 */
export const contentBlocks = mysqlTable(
  "content_blocks",
  {
    id: id(),
    section: str(60).notNull(),
    icon: str(60), // lucide icon name, e.g. "ShieldCheck"
    title: str().notNull(),
    text: text(),
    link: str(),
    sortOrder: int().notNull().default(0),
    active: boolean().notNull().default(true),
  },
  (t) => [index("content_blocks_section_idx").on(t.section)],
);

export const testimonials = mysqlTable("testimonials", {
  id: id(),
  name: str().notNull(),
  role: str(),
  location: str(),
  avatar: str(),
  quote: text().notNull(),
  rating: int().notNull().default(5),
  page: str(40).notNull().default("claim"),
  sortOrder: int().notNull().default(0),
  active: boolean().notNull().default(true),
});

// ──────────────────────────────── Blog ────────────────────────────────

export const blogCategories = mysqlTable("blog_categories", {
  id: id(),
  name: str().notNull(),
  slug: str().notNull().unique(),
  description: text(),
  ...seo(),
});

export const blogTags = mysqlTable("blog_tags", {
  id: id(),
  name: str().notNull(),
  slug: str().notNull().unique(),
});

export const blogPosts = mysqlTable(
  "blog_posts",
  {
    id: id(),
    title: str().notNull(),
    slug: str().notNull().unique(),
    excerpt: text(),
    content: longtext().notNull(), // HTML from the rich-text editor
    coverImage: str(),
    coverAlt: str(),
    authorName: str(),
    authorAvatar: str(),
    categoryId: int().references(() => blogCategories.id, { onDelete: "set null" }),
    published: boolean().notNull().default(false),
    publishedAt: dt(),
    featured: boolean().notNull().default(false), // "Helpful resources" on home
    readingMinutes: int(),
    views: int().notNull().default(0),
    ratingSum: int().notNull().default(0),
    ratingCount: int().notNull().default(0),
    ...seo(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("blog_posts_published_published_at_idx").on(t.published, t.publishedAt)],
);

/** Many-to-many: blog post ↔ tag */
export const blogPostTags = mysqlTable(
  "blog_post_tags",
  {
    postId: int()
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    tagId: int()
      .notNull()
      .references(() => blogTags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] }), index("blog_post_tags_tag_id_idx").on(t.tagId)],
);

export const blogComments = mysqlTable(
  "blog_comments",
  {
    id: id(),
    postId: int()
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    name: str().notNull(),
    email: str().notNull(),
    body: text().notNull(),
    status: mysqlEnum(MODERATION_STATUSES).notNull().default("PENDING"),
    createdAt: createdAt(),
  },
  (t) => [index("blog_comments_post_id_status_idx").on(t.postId, t.status)],
);

export const blogRatings = mysqlTable(
  "blog_ratings",
  {
    id: id(),
    postId: int()
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    visitorId: str(64).notNull(),
    rating: int().notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("blog_ratings_post_id_visitor_id_key").on(t.postId, t.visitorId)],
);

// ────────────────────────────── Products ──────────────────────────────

/** Product categories = pain areas in the Recovery Marketplace */
export const productCategories = mysqlTable("product_categories", {
  id: id(),
  name: str().notNull(),
  slug: str().notNull().unique(),
  icon: str(60),
  description: text(),
  sortOrder: int().notNull().default(0),
  ...seo(),
});

export const products = mysqlTable("products", {
  id: id(),
  name: str().notNull(),
  slug: str().notNull().unique(),
  shortDescription: str(500),
  description: text(),
  priceCents: int().notNull(),
  compareAtCents: int(),
  image: str(),
  /** Extra gallery image URLs */
  images: json().$type<string[] | null>(),
  sku: str(80),
  stock: int(),
  brand: str(),
  productType: str(80),
  useCases: str(255), // comma separated
  categoryId: int().references(() => productCategories.id, { onDelete: "set null" }),
  active: boolean().notNull().default(true),
  featured: boolean().notNull().default(false),
  sortOrder: int().notNull().default(0),
  ...seo(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const orders = mysqlTable("orders", {
  id: id(),
  orderNumber: str().notNull().unique(),
  customerName: str().notNull(),
  email: str().notNull(),
  phone: str(40),
  address1: str().notNull(),
  address2: str(),
  city: str().notNull(),
  state: str().notNull(),
  zip: str(20).notNull(),
  country: str().notNull().default("US"),
  notes: text(),
  subtotalCents: int().notNull(),
  shippingCents: int().notNull().default(0),
  taxCents: int().notNull().default(0),
  totalCents: int().notNull(),
  currency: str(8).notNull().default("USD"),
  status: mysqlEnum(ORDER_STATUSES).notNull().default("PENDING"),
  paymentMethod: str(30).notNull(),
  paymentRef: str(),
  paidAt: dt(),
  createdAt: createdAt(),
});

export const orderItems = mysqlTable("order_items", {
  id: id(),
  orderId: int()
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: int().references(() => products.id, { onDelete: "set null" }),
  name: str().notNull(),
  image: str(),
  priceCents: int().notNull(),
  quantity: int().notNull(),
});

// ───────────────────────────── Analytics ──────────────────────────────

export const visitors = mysqlTable(
  "visitors",
  {
    id: str(64).primaryKey(), // random id kept in a cookie
    firstSeenAt: createdAt(),
    lastSeenAt: createdAt(),
    visitCount: int().notNull().default(1), // number of sessions
    pageViews: int().notNull().default(0),
    lastSessionId: str(64),
    device: str(30),
    browser: str(60),
    os: str(60),
    country: str(80),
    region: str(80),
    city: str(120),
    lat: double(),
    lng: double(),
    referrer: str(500),
  },
  (t) => [index("visitors_last_seen_at_idx").on(t.lastSeenAt)],
);

export const analyticsEvents = mysqlTable(
  "analytics_events",
  {
    id: id(),
    type: mysqlEnum(EVENT_TYPES).notNull(),
    visitorId: str(64).references(() => visitors.id, { onDelete: "set null" }),
    sessionId: str(64),
    providerId: int().references(() => providers.id, { onDelete: "cascade" }),
    path: str(500),
    referrer: str(500),
    device: str(30),
    browser: str(60),
    os: str(60),
    country: str(80),
    city: str(120),
    /** Extra details, e.g. { "condition": "back-pain", "imageId": 12 } */
    meta: json().$type<Record<string, unknown> | null>(),
    createdAt: createdAt(),
  },
  (t) => [
    index("analytics_events_type_created_at_idx").on(t.type, t.createdAt),
    index("analytics_events_provider_id_type_created_at_idx").on(t.providerId, t.type, t.createdAt),
    index("analytics_events_visitor_id_idx").on(t.visitorId),
    index("analytics_events_created_at_idx").on(t.createdAt),
  ],
);

// ────────────────────────── CMS / SEO / Media ─────────────────────────

/** WordPress-style media library entry */
export const media = mysqlTable(
  "media",
  {
    id: id(),
    filename: str().notNull(),
    originalName: str().notNull(),
    url: str().notNull(), // public URL, e.g. /uploads/media/2026/09/x.webp
    path: str().notNull(), // path relative to UPLOAD_DIR
    mimeType: str(120).notNull(),
    size: int().notNull(),
    width: int(),
    height: int(),
    alt: str(),
    title: str(),
    folder: str().notNull().default("media"), // "media/2026/09", "providers/5/gallery"
    uploadedById: int().references(() => users.id, { onDelete: "set null" }),
    providerId: int().references(() => providers.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [index("media_folder_idx").on(t.folder), index("media_mime_type_idx").on(t.mimeType)],
);

/** SEO settings for fixed pages (home, search, claim, products, blog…) */
export const pageSeo = mysqlTable("page_seo", {
  id: id(),
  pageKey: str(60).notNull().unique(),
  label: str().notNull(),
  metaTitle: str(255),
  metaDescription: str(500),
  metaKeywords: str(500),
  ogTitle: str(255),
  ogDescription: str(500),
  ogImage: str(),
  canonical: str(),
  noIndex: boolean().notNull().default(false),
});

/** Free-form content pages (About, Privacy, Terms, Help…) served at /{slug} */
export const cmsPages = mysqlTable("cms_pages", {
  id: id(),
  title: str().notNull(),
  slug: str().notNull().unique(),
  excerpt: text(),
  content: longtext().notNull(),
  heroImage: str(),
  published: boolean().notNull().default(true),
  footerGroup: str(40), // "company", "providers" – shows the link in that footer column
  sortOrder: int().notNull().default(0),
  ...seo(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const contactMessages = mysqlTable("contact_messages", {
  id: id(),
  name: str().notNull(),
  email: str().notNull(),
  phone: str(40),
  subject: str().notNull(),
  message: text().notNull(),
  read: boolean().notNull().default(false),
  createdAt: createdAt(),
});

/** Key/value site settings (branding, contact, social, payments, SMTP, captcha…) */
export const settings = mysqlTable("settings", {
  key: str(80).primaryKey(),
  value: json().notNull(),
});

// ───────────────────────────── Row types ──────────────────────────────
// `typeof table.$inferSelect` = a row read from the database,
// `typeof table.$inferInsert` = the object you pass to db.insert().

export type User = typeof users.$inferSelect;
export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;
export type ProviderLocation = typeof providerLocations.$inferSelect;
export type GalleryImage = typeof galleryImages.$inferSelect;
export type ProviderVideo = typeof providerVideos.$inferSelect;
export type ProviderFaq = typeof providerFaqs.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type AppointmentRequest = typeof appointmentRequests.$inferSelect;
export type ProviderMessage = typeof providerMessages.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type PlanOrder = typeof planOrders.$inferSelect;
export type City = typeof cities.$inferSelect;
export type Condition = typeof conditions.$inferSelect;
export type Specialty = typeof specialties.$inferSelect;
export type Insurance = typeof insurances.$inferSelect;
export type PopularSearch = typeof popularSearches.$inferSelect;
export type ContentBlock = typeof contentBlocks.$inferSelect;
export type Testimonial = typeof testimonials.$inferSelect;
export type BlogCategory = typeof blogCategories.$inferSelect;
export type BlogTag = typeof blogTags.$inferSelect;
export type BlogPost = typeof blogPosts.$inferSelect;
export type BlogComment = typeof blogComments.$inferSelect;
export type ProductCategory = typeof productCategories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Visitor = typeof visitors.$inferSelect;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type Media = typeof media.$inferSelect;
export type PageSeo = typeof pageSeo.$inferSelect;
export type CmsPage = typeof cmsPages.$inferSelect;
export type ContactMessage = typeof contactMessages.$inferSelect;
