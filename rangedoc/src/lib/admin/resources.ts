/**
 * ADMIN RESOURCE DEFINITIONS
 * ------------------------------------------------------------------
 * Every admin-managed table is described here once: which fields the
 * edit form shows, which columns the list shows, search fields, filters
 * and quick actions. The generic pages in /admin/r/[resource] and the
 * server actions in src/lib/admin/actions.ts use these definitions.
 *
 * To add a new admin section: add a table to src/db/schema.ts, then add a resource
 * entry below – no new page code needed.
 *
 * This file contains plain data only (no functions) so it can be sent
 * to client components.
 */

export type FieldType =
  | "text" | "textarea" | "richtext" | "number" | "money" | "boolean" | "select" | "relation" | "relationMany"
  | "image" | "images" | "file" | "date" | "datetime" | "list" | "icon" | "latlng" | "slug" | "email" | "url" | "password" | "json";

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  placeholder?: string;
  /** select options (value/label) */
  options?: { value: string; label: string }[];
  /** relation / relationMany: table name (see src/db/schema.ts) + label column */
  relation?: { model: string; labelField: string; orderBy?: string };
  /** slug: generate from this field when left empty */
  from?: string;
  /** "main" (left column), "side" (right column) or "seo" */
  group?: "main" | "side" | "seo";
  /** full width on the grid */
  wide?: boolean;
  readOnly?: boolean;
  /** file accept for image/file pickers */
  accept?: "image" | "video" | "pdf" | "all";
  defaultValue?: string | number | boolean;
  /** number/money: an empty input saves NULL (otherwise empty = keep default / unchanged) */
  nullable?: boolean;
};

export type ColumnDef = {
  field: string; // supports dot paths: "category.name", "_count.providers" (needs `counts`)
  label: string;
  type?: "text" | "image" | "boolean" | "badge" | "money" | "date" | "number" | "stars";
};

export type ResourceDef = {
  key: string;
  model: string; // Drizzle table name exported from src/db/schema.ts, e.g. "providers"
  label: string;
  singular: string;
  icon: string;
  group: string;
  description?: string;
  fields: FieldDef[];
  columns: ColumnDef[];
  searchFields: string[];
  orderBy: Record<string, "asc" | "desc">[];
  /** Drizzle `with` for the list query (relation columns), e.g. { city: { columns: { name: true } } } */
  with?: Record<string, unknown>;
  /** Related rows to count for "_count.x" columns, e.g. ["providers"] (see COUNTS in src/lib/admin/data.ts) */
  counts?: string[];
  filters?: { field: string; label: string; options: { value: string; label: string }[] }[];
  /** One-click actions in the list, e.g. Approve → status=APPROVED */
  quickActions?: { label: string; field: string; value: string | boolean; tone?: "green" | "red" }[];
  canCreate?: boolean;
  canDelete?: boolean;
  /** Public URL for "View" links: "/provider/{slug}" */
  viewPath?: string;
  /** Custom edit page instead of the generic form */
  editPath?: string;
};

// ───────────────────────────── Helpers ─────────────────────────────

const opt = (...values: string[]) => values.map((v) => ({ value: v, label: v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ") }));
const MODERATION = opt("PENDING", "APPROVED", "REJECTED");
const ORDER_STATUS = opt("PENDING", "PAID", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED", "REFUNDED", "FAILED");
const PROVIDER_TYPES = [
  { value: "PHYSICAL_THERAPIST", label: "Physical Therapist" },
  { value: "CHIROPRACTOR", label: "Chiropractor" },
];

/** Standard SEO inputs (shown in the "SEO" box of the edit form) */
export const seoFields = (): FieldDef[] => [
  { name: "metaTitle", label: "Meta title", type: "text", group: "seo", help: "Recommended 50–60 characters" },
  { name: "metaDescription", label: "Meta description", type: "textarea", group: "seo", help: "Recommended 120–160 characters" },
  { name: "metaKeywords", label: "Meta keywords", type: "text", group: "seo", help: "Comma separated" },
  { name: "ogImage", label: "Social share image (Open Graph)", type: "image", group: "seo", help: "1200×630 recommended" },
];

// ───────────────────────────── Resources ─────────────────────────────

export const RESOURCES: ResourceDef[] = [
  // ============ Directory ============
  {
    key: "providers",
    model: "providers",
    label: "Providers",
    singular: "Provider",
    icon: "Stethoscope",
    group: "Directory",
    viewPath: "/provider/{slug}",
    with: { city: { columns: { name: true, stateCode: true } }, plan: { columns: { name: true } } },
    columns: [
      { field: "photo", label: "", type: "image" },
      { field: "firstName", label: "First" },
      { field: "lastName", label: "Last" },
      { field: "providerType", label: "Type", type: "badge" },
      { field: "city.name", label: "City" },
      { field: "claimStatus", label: "Claim", type: "badge" },
      { field: "plan.name", label: "Plan" },
      { field: "licenseVerified", label: "Verified", type: "boolean" },
      { field: "featured", label: "Featured", type: "boolean" },
    ],
    searchFields: ["firstName", "lastName", "practiceName", "email"],
    orderBy: [{ id: "desc" }],
    filters: [
      { field: "claimStatus", label: "Claim status", options: opt("UNCLAIMED", "PENDING", "CLAIMED") },
      { field: "providerType", label: "Type", options: PROVIDER_TYPES },
      { field: "status", label: "Status", options: opt("ACTIVE", "INACTIVE") },
    ],
    quickActions: [
      { label: "Verify license", field: "licenseVerified", value: true, tone: "green" },
      { label: "Feature", field: "featured", value: true },
    ],
    fields: [
      { name: "prefix", label: "Prefix", type: "text", placeholder: "Dr." },
      { name: "firstName", label: "First name", type: "text", required: true },
      { name: "lastName", label: "Last name", type: "text", required: true },
      { name: "credentials", label: "Credentials", type: "text", placeholder: "PT, DPT" },
      { name: "slug", label: "URL slug", type: "slug", from: "firstName,lastName", help: "Profile URL: /provider/{slug}" },
      { name: "providerType", label: "Provider type", type: "select", options: PROVIDER_TYPES, required: true },
      { name: "headline", label: "Title under name", type: "text" },
      { name: "practiceName", label: "Practice name", type: "text" },
      { name: "photo", label: "Profile photo", type: "image" },
      { name: "bio", label: "Biography", type: "textarea", wide: true },
      { name: "quote", label: "Quote", type: "textarea" },
      { name: "bestMatch", label: "Best match paragraph", type: "textarea" },
      { name: "bestMatchPoints", label: "Best match bullets (one per line)", type: "textarea" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "email", label: "Public email", type: "email" },
      { name: "website", label: "Website", type: "url" },
      { name: "videoUrl", label: "Intro video (YouTube/Vimeo/MP4)", type: "file", accept: "video" },
      { name: "facebookUrl", label: "Facebook", type: "url" },
      { name: "xUrl", label: "X (Twitter)", type: "url" },
      { name: "linkedinUrl", label: "LinkedIn", type: "url" },
      { name: "pinterestUrl", label: "Pinterest", type: "url" },
      { name: "youtubeUrl", label: "YouTube channel", type: "url" },
      { name: "instagramUrl", label: "Instagram", type: "url" },
      { name: "gender", label: "Gender", type: "select", options: [{ value: "Female", label: "Female" }, { value: "Male", label: "Male" }, { value: "Non-binary", label: "Non-binary" }] },
      { name: "languages", label: "Languages", type: "text" },
      { name: "education", label: "Education", type: "text" },
      { name: "yearsExperience", label: "Years of experience", type: "number", nullable: true },
      { name: "licenseNumber", label: "License number", type: "text" },
      { name: "licenseState", label: "License state", type: "text" },
      { name: "responseTime", label: "Response time note", type: "text" },
      { name: "conditions", label: "Conditions treated", type: "relationMany", relation: { model: "conditions", labelField: "name", orderBy: "sortOrder" }, wide: true },
      { name: "specialties", label: "Treatment specialties", type: "relationMany", relation: { model: "specialties", labelField: "name", orderBy: "sortOrder" }, wide: true },
      { name: "insurances", label: "Insurance accepted", type: "relationMany", relation: { model: "insurances", labelField: "name", orderBy: "sortOrder" }, wide: true },
      { name: "status", label: "Status", type: "select", options: opt("ACTIVE", "INACTIVE"), group: "side", defaultValue: "ACTIVE" },
      { name: "claimStatus", label: "Claim status", type: "select", options: opt("UNCLAIMED", "PENDING", "CLAIMED"), group: "side", defaultValue: "UNCLAIMED" },
      { name: "claimNote", label: "Claim note", type: "textarea", group: "side", readOnly: true },
      { name: "licenseVerified", label: "License verified", type: "boolean", group: "side" },
      { name: "planId", label: "Plan", type: "relation", relation: { model: "plans", labelField: "name", orderBy: "sortOrder" }, group: "side" },
      { name: "planExpiresAt", label: "Plan expires", type: "datetime", group: "side", help: "Empty = never", nullable: true },
      { name: "featured", label: "Featured on home page", type: "boolean", group: "side" },
      { name: "featuredOrder", label: "Featured order", type: "number", group: "side" },
      { name: "cityId", label: "Main city", type: "relation", relation: { model: "cities", labelField: "name", orderBy: "name" }, group: "side" },
      { name: "acceptingNewPatients", label: "Accepting new patients", type: "boolean", group: "side", defaultValue: true },
      { name: "inPerson", label: "In-person", type: "boolean", group: "side", defaultValue: true },
      { name: "telehealth", label: "Telehealth", type: "boolean", group: "side" },
      { name: "slotMinutes", label: "Appointment length (min)", type: "number", group: "side", defaultValue: 30 },
      { name: "displayRating", label: "Displayed rating (0–5)", type: "number", group: "side", nullable: true },
      { name: "displayReviewCount", label: "Displayed review count", type: "number", group: "side", nullable: true },
      { name: "ratingSource", label: "Rating source", type: "text", group: "side" },
      { name: "endorsement", label: "Endorsement", type: "text", group: "side" },
      ...seoFields(),
    ],
  },
  {
    key: "locations",
    model: "providerLocations",
    label: "Provider Locations",
    singular: "Location",
    icon: "MapPin",
    group: "Directory",
    with: { provider: { columns: { firstName: true, lastName: true } } },
    columns: [
      { field: "name", label: "Name" },
      { field: "provider.firstName+provider.lastName", label: "Provider" },
      { field: "address", label: "Address" },
      { field: "cityName", label: "City" },
      { field: "isPrimary", label: "Primary", type: "boolean" },
    ],
    searchFields: ["name", "address", "cityName", "zip"],
    orderBy: [{ id: "desc" }],
    fields: [
      { name: "providerId", label: "Provider", type: "relation", relation: { model: "providers", labelField: "firstName+lastName", orderBy: "lastName" }, required: true },
      { name: "name", label: "Location name", type: "text", required: true },
      { name: "address", label: "Street address", type: "text", required: true },
      { name: "address2", label: "Suite / floor", type: "text" },
      { name: "cityId", label: "City", type: "relation", relation: { model: "cities", labelField: "name", orderBy: "name" } },
      { name: "cityName", label: "City name (display)", type: "text", required: true },
      { name: "state", label: "State code", type: "text", required: true },
      { name: "zip", label: "ZIP", type: "text", required: true },
      { name: "phone", label: "Phone", type: "text" },
      { name: "latlng", label: "Map position", type: "latlng", wide: true, help: "Click the map to set latitude/longitude" },
      { name: "isPrimary", label: "Primary location", type: "boolean", group: "side" },
      { name: "sortOrder", label: "Sort order", type: "number", group: "side" },
    ],
  },
  {
    key: "cities",
    model: "cities",
    label: "Cities",
    singular: "City",
    icon: "Building2",
    group: "Directory",
    description: "The site is city based. Add cities with their map position; featured cities appear in “Find Care Near You”.",
    viewPath: "/locations/{slug}",
    counts: ["providers"],
    columns: [
      { field: "image", label: "", type: "image" },
      { field: "name", label: "City" },
      { field: "stateCode", label: "State" },
      { field: "_count.providers", label: "Providers", type: "number" },
      { field: "featured", label: "Featured", type: "boolean" },
      { field: "active", label: "Active", type: "boolean" },
      { field: "sortOrder", label: "Order", type: "number" },
    ],
    searchFields: ["name", "state", "stateCode", "zipCodes"],
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    quickActions: [{ label: "Feature", field: "featured", value: true }, { label: "Unfeature", field: "featured", value: false }],
    fields: [
      { name: "name", label: "City name", type: "text", required: true },
      { name: "state", label: "State", type: "text", required: true },
      { name: "stateCode", label: "State code", type: "text", required: true, placeholder: "TX" },
      { name: "slug", label: "URL slug", type: "slug", from: "name,stateCode" },
      { name: "latlng", label: "Map position (click to set)", type: "latlng", wide: true },
      { name: "zipCodes", label: "ZIP codes", type: "textarea", help: "Comma separated – used for ZIP search", wide: true },
      { name: "description", label: "Description", type: "textarea", wide: true },
      { name: "image", label: "City image", type: "image", group: "side" },
      { name: "featured", label: "Featured on home page", type: "boolean", group: "side" },
      { name: "active", label: "Active", type: "boolean", group: "side", defaultValue: true },
      { name: "sortOrder", label: "Sort order", type: "number", group: "side" },
      ...seoFields(),
    ],
  },
  {
    key: "conditions",
    model: "conditions",
    label: "Conditions / Pain Areas",
    singular: "Condition",
    icon: "Activity",
    group: "Directory",
    description: "Shown in “Where does it hurt?”, search suggestions and filters.",
    viewPath: "/conditions/{slug}",
    counts: ["providers"],
    columns: [
      { field: "image", label: "", type: "image" },
      { field: "name", label: "Name" },
      { field: "shortName", label: "Home label" },
      { field: "_count.providers", label: "Providers", type: "number" },
      { field: "showOnHome", label: "On home", type: "boolean" },
      { field: "sortOrder", label: "Order", type: "number" },
    ],
    searchFields: ["name", "keywords"],
    orderBy: [{ sortOrder: "asc" }],
    fields: [
      { name: "name", label: "Name", type: "text", required: true, placeholder: "Back Pain" },
      { name: "shortName", label: "Short label (home tiles)", type: "text", placeholder: "Back & Spine" },
      { name: "slug", label: "URL slug", type: "slug", from: "name" },
      { name: "keywords", label: "Search keywords / synonyms", type: "textarea", help: "Comma separated, e.g. lower back pain, herniated disc", wide: true },
      { name: "description", label: "Description", type: "textarea", wide: true },
      { name: "image", label: "Illustration", type: "image", group: "side" },
      { name: "showOnHome", label: "Show in “Where does it hurt?”", type: "boolean", group: "side", defaultValue: true },
      { name: "active", label: "Active", type: "boolean", group: "side", defaultValue: true },
      { name: "sortOrder", label: "Sort order", type: "number", group: "side" },
      ...seoFields(),
    ],
  },
  {
    key: "specialties",
    model: "specialties",
    label: "Treatments / Specialties",
    singular: "Specialty",
    icon: "Sparkles",
    group: "Directory",
    columns: [{ field: "name", label: "Name" }, { field: "slug", label: "Slug" }, { field: "sortOrder", label: "Order", type: "number" }],
    searchFields: ["name"],
    orderBy: [{ sortOrder: "asc" }],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "slug", label: "Slug", type: "slug", from: "name" },
      { name: "description", label: "Description", type: "textarea", wide: true },
      { name: "sortOrder", label: "Sort order", type: "number", group: "side" },
    ],
  },
  {
    key: "insurances",
    model: "insurances",
    label: "Insurances",
    singular: "Insurance",
    icon: "ShieldCheck",
    group: "Directory",
    columns: [{ field: "logo", label: "", type: "image" }, { field: "name", label: "Name" }, { field: "sortOrder", label: "Order", type: "number" }],
    searchFields: ["name"],
    orderBy: [{ sortOrder: "asc" }],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "slug", label: "Slug", type: "slug", from: "name" },
      { name: "logo", label: "Logo", type: "image", group: "side" },
      { name: "sortOrder", label: "Sort order", type: "number", group: "side" },
    ],
  },
  {
    key: "faqs",
    model: "providerFaqs",
    label: "Provider FAQs",
    singular: "FAQ",
    icon: "HelpCircle",
    group: "Directory",
    with: { provider: { columns: { firstName: true, lastName: true } } },
    columns: [{ field: "question", label: "Question" }, { field: "provider.firstName+provider.lastName", label: "Provider" }, { field: "sortOrder", label: "Order", type: "number" }],
    searchFields: ["question", "answer"],
    orderBy: [{ id: "desc" }],
    fields: [
      { name: "providerId", label: "Provider", type: "relation", relation: { model: "providers", labelField: "firstName+lastName", orderBy: "lastName" }, required: true },
      { name: "question", label: "Question", type: "text", required: true, wide: true },
      { name: "answer", label: "Answer", type: "textarea", required: true, wide: true },
      { name: "sortOrder", label: "Sort order", type: "number", group: "side" },
    ],
  },

  {
    key: "videos",
    model: "providerVideos",
    label: "Provider Videos",
    singular: "Video",
    icon: "Film",
    group: "Directory",
    description: "Video gallery items (YouTube / Vimeo links or uploaded videos). Shown for plans with a video gallery.",
    with: { provider: { columns: { firstName: true, lastName: true } } },
    columns: [{ field: "title", label: "Title" }, { field: "provider.firstName+provider.lastName", label: "Provider" }, { field: "url", label: "URL" }, { field: "sortOrder", label: "Order", type: "number" }],
    searchFields: ["title", "url"],
    orderBy: [{ id: "desc" }],
    fields: [
      { name: "providerId", label: "Provider", type: "relation", relation: { model: "providers", labelField: "firstName+lastName", orderBy: "lastName" }, required: true },
      { name: "title", label: "Title", type: "text", required: true, wide: true },
      { name: "url", label: "Video (YouTube/Vimeo link or upload)", type: "file", accept: "video", required: true, wide: true },
      { name: "thumbnail", label: "Thumbnail (optional)", type: "image", group: "side" },
      { name: "sortOrder", label: "Sort order", type: "number", group: "side" },
    ],
  },

  // ============ Leads & moderation ============
  {
    key: "appointments",
    model: "appointmentRequests",
    label: "Appointment Requests",
    singular: "Appointment",
    icon: "CalendarCheck",
    group: "Leads",
    canCreate: false,
    with: { provider: { columns: { firstName: true, lastName: true } } },
    columns: [
      { field: "date", label: "Date", type: "date" },
      { field: "timeSlot", label: "Time" },
      { field: "firstName", label: "First" },
      { field: "lastName", label: "Last" },
      { field: "provider.firstName+provider.lastName", label: "Provider" },
      { field: "status", label: "Status", type: "badge" },
      { field: "createdAt", label: "Requested", type: "date" },
    ],
    searchFields: ["firstName", "lastName", "email", "phone"],
    orderBy: [{ createdAt: "desc" }],
    filters: [{ field: "status", label: "Status", options: opt("NEW", "CONFIRMED", "COMPLETED", "CANCELLED") }],
    fields: [
      { name: "firstName", label: "First name", type: "text", readOnly: true },
      { name: "lastName", label: "Last name", type: "text", readOnly: true },
      { name: "email", label: "Email", type: "email", readOnly: true },
      { name: "phone", label: "Phone", type: "text", readOnly: true },
      { name: "date", label: "Date", type: "date", readOnly: true },
      { name: "timeSlot", label: "Time", type: "text", readOnly: true },
      { name: "insurance", label: "Insurance", type: "text", readOnly: true },
      { name: "reason", label: "Reason", type: "textarea", readOnly: true, wide: true },
      { name: "status", label: "Status", type: "select", options: opt("NEW", "CONFIRMED", "COMPLETED", "CANCELLED"), group: "side" },
      { name: "providerNote", label: "Note", type: "textarea", group: "side" },
    ],
  },
  {
    key: "messages",
    model: "providerMessages",
    label: "Provider Emails",
    singular: "Email",
    icon: "Mail",
    group: "Leads",
    canCreate: false,
    with: { provider: { columns: { firstName: true, lastName: true } } },
    columns: [
      { field: "name", label: "From" },
      { field: "contact", label: "Email / phone" },
      { field: "subject", label: "Subject" },
      { field: "provider.firstName+provider.lastName", label: "Provider" },
      { field: "read", label: "Read", type: "boolean" },
      { field: "createdAt", label: "Date", type: "date" },
    ],
    searchFields: ["name", "contact", "subject", "message"],
    orderBy: [{ createdAt: "desc" }],
    fields: [
      { name: "name", label: "From", type: "text", readOnly: true },
      { name: "contact", label: "Email or phone", type: "text", readOnly: true },
      { name: "subject", label: "Subject", type: "text", readOnly: true, wide: true },
      { name: "message", label: "Message", type: "textarea", readOnly: true, wide: true },
      { name: "read", label: "Read by provider", type: "boolean", group: "side" },
    ],
  },
  {
    key: "reviews",
    model: "reviews",
    label: "Reviews",
    singular: "Review",
    icon: "Star",
    group: "Leads",
    with: { provider: { columns: { firstName: true, lastName: true } } },
    columns: [
      { field: "rating", label: "Rating", type: "stars" },
      { field: "title", label: "Title" },
      { field: "authorName", label: "Author" },
      { field: "provider.firstName+provider.lastName", label: "Provider" },
      { field: "status", label: "Status", type: "badge" },
      { field: "createdAt", label: "Date", type: "date" },
    ],
    searchFields: ["title", "body", "authorName"],
    orderBy: [{ createdAt: "desc" }],
    filters: [{ field: "status", label: "Status", options: MODERATION }],
    quickActions: [
      { label: "Approve", field: "status", value: "APPROVED", tone: "green" },
      { label: "Reject", field: "status", value: "REJECTED", tone: "red" },
    ],
    fields: [
      { name: "providerId", label: "Provider", type: "relation", relation: { model: "providers", labelField: "firstName+lastName", orderBy: "lastName" }, required: true },
      { name: "authorName", label: "Author", type: "text", required: true },
      { name: "authorEmail", label: "Author email", type: "email" },
      { name: "rating", label: "Rating (1–5)", type: "number", required: true },
      { name: "title", label: "Title", type: "text", wide: true },
      { name: "body", label: "Review", type: "textarea", required: true, wide: true },
      { name: "status", label: "Status", type: "select", options: MODERATION, group: "side", defaultValue: "APPROVED" },
    ],
  },
  {
    key: "contacts",
    model: "contactMessages",
    label: "Contact Messages",
    singular: "Contact message",
    icon: "Inbox",
    group: "Leads",
    canCreate: false,
    columns: [
      { field: "name", label: "Name" },
      { field: "email", label: "Email" },
      { field: "subject", label: "Subject" },
      { field: "read", label: "Read", type: "boolean" },
      { field: "createdAt", label: "Date", type: "date" },
    ],
    searchFields: ["name", "email", "subject", "message"],
    orderBy: [{ createdAt: "desc" }],
    quickActions: [{ label: "Mark read", field: "read", value: true }],
    fields: [
      { name: "name", label: "Name", type: "text", readOnly: true },
      { name: "email", label: "Email", type: "email", readOnly: true },
      { name: "phone", label: "Phone", type: "text", readOnly: true },
      { name: "subject", label: "Subject", type: "text", readOnly: true, wide: true },
      { name: "message", label: "Message", type: "textarea", readOnly: true, wide: true },
      { name: "read", label: "Read", type: "boolean", group: "side" },
    ],
  },

  // ============ Monetization ============
  {
    key: "plans",
    model: "plans",
    label: "Plans & Pricing",
    singular: "Plan",
    icon: "CreditCard",
    group: "Sales",
    description: "Pricing shown on “Claim your profile”. The capabilities decide what each provider can use.",
    columns: [
      { field: "name", label: "Name" },
      { field: "priceCents", label: "Price", type: "money" },
      { field: "interval", label: "Billing", type: "badge" },
      { field: "isFree", label: "Free", type: "boolean" },
      { field: "searchPriority", label: "Search priority", type: "number" },
      { field: "active", label: "Active", type: "boolean" },
      { field: "sortOrder", label: "Order", type: "number" },
    ],
    searchFields: ["name"],
    orderBy: [{ sortOrder: "asc" }],
    fields: [
      { name: "name", label: "Plan name", type: "text", required: true },
      { name: "slug", label: "Slug", type: "slug", from: "name" },
      { name: "tagline", label: "Tagline", type: "text", wide: true },
      { name: "priceCents", label: "Price ($)", type: "money" },
      { name: "interval", label: "Billing interval", type: "select", options: opt("MONTH", "YEAR", "LIFETIME"), defaultValue: "MONTH" },
      { name: "priceNote", label: "Note under price", type: "text", placeholder: "Cancel anytime" },
      { name: "ctaLabel", label: "Button label", type: "text" },
      { name: "badge", label: "Badge", type: "text", placeholder: "MOST POPULAR" },
      { name: "features", label: "Feature bullets", type: "list", help: "One feature per line", wide: true },
      { name: "maxPhotos", label: "Max gallery photos", type: "number", defaultValue: 4 },
      { name: "maxLocations", label: "Max locations", type: "number", defaultValue: 1 },
      { name: "maxFaqs", label: "Max FAQs", type: "number", defaultValue: 3 },
      { name: "maxVideos", label: "Max gallery videos", type: "number", defaultValue: 0 },
      { name: "searchPriority", label: "Search priority (higher = first)", type: "number", defaultValue: 0 },
      { name: "isFree", label: "This is the free plan", type: "boolean", group: "side" },
      { name: "isPopular", label: "Highlight as popular", type: "boolean", group: "side" },
      { name: "allowReviews", label: "Reviews & star rating", type: "boolean", group: "side" },
      { name: "allowRatingDisplay", label: "Show provider-set rating", type: "boolean", group: "side" },
      { name: "allowShareSave", label: "Save & share buttons", type: "boolean", group: "side" },
      { name: "allowVideo", label: "Intro video", type: "boolean", group: "side" },
      { name: "allowSocialLinks", label: "Social network links", type: "boolean", group: "side" },
      { name: "allowAnalytics", label: "Full analytics", type: "boolean", group: "side" },
      { name: "allowAllFaqs", label: "“View all FAQs”", type: "boolean", group: "side" },
      { name: "featuredBadge", label: "Featured badge", type: "boolean", group: "side" },
      { name: "active", label: "Active", type: "boolean", group: "side", defaultValue: true },
      { name: "sortOrder", label: "Sort order", type: "number", group: "side" },
    ],
  },
  {
    key: "plan-orders",
    model: "planOrders",
    label: "Plan Orders",
    singular: "Plan order",
    icon: "Layers",
    group: "Sales",
    canCreate: false,
    description: "Marking an order as Paid activates the plan on the provider's profile.",
    with: { plan: { columns: { name: true } }, provider: { columns: { firstName: true, lastName: true } } },
    columns: [
      { field: "orderNumber", label: "Order" },
      { field: "provider.firstName+provider.lastName", label: "Provider" },
      { field: "plan.name", label: "Plan" },
      { field: "amountCents", label: "Amount", type: "money" },
      { field: "paymentMethod", label: "Method" },
      { field: "status", label: "Status", type: "badge" },
      { field: "createdAt", label: "Date", type: "date" },
    ],
    searchFields: ["orderNumber", "billingName", "billingEmail"],
    orderBy: [{ createdAt: "desc" }],
    filters: [{ field: "status", label: "Status", options: ORDER_STATUS }],
    quickActions: [{ label: "Mark paid", field: "status", value: "PAID", tone: "green" }],
    fields: [
      { name: "orderNumber", label: "Order number", type: "text", readOnly: true },
      { name: "billingName", label: "Billing name", type: "text", readOnly: true },
      { name: "billingEmail", label: "Billing email", type: "email", readOnly: true },
      { name: "billingPhone", label: "Phone", type: "text", readOnly: true },
      { name: "billingAddress", label: "Address", type: "text", readOnly: true, wide: true },
      { name: "paymentMethod", label: "Payment method", type: "text", readOnly: true },
      { name: "paymentRef", label: "Payment reference", type: "text" },
      { name: "status", label: "Status", type: "select", options: ORDER_STATUS, group: "side" },
    ],
  },
  {
    key: "products",
    model: "products",
    label: "Products",
    singular: "Product",
    icon: "Package",
    group: "Sales",
    viewPath: "/products/{slug}",
    with: { category: { columns: { name: true } } },
    columns: [
      { field: "image", label: "", type: "image" },
      { field: "name", label: "Name" },
      { field: "category.name", label: "Pain area" },
      { field: "priceCents", label: "Price", type: "money" },
      { field: "stock", label: "Stock", type: "number" },
      { field: "active", label: "Active", type: "boolean" },
      { field: "featured", label: "Featured", type: "boolean" },
    ],
    searchFields: ["name", "brand", "sku"],
    orderBy: [{ sortOrder: "asc" }, { id: "desc" }],
    fields: [
      { name: "name", label: "Product name", type: "text", required: true, wide: true },
      { name: "slug", label: "Slug", type: "slug", from: "name" },
      { name: "sku", label: "SKU", type: "text" },
      { name: "priceCents", label: "Price ($)", type: "money", required: true },
      { name: "compareAtCents", label: "Compare-at price ($)", type: "money", nullable: true },
      { name: "brand", label: "Brand", type: "text" },
      { name: "productType", label: "Product type", type: "text", placeholder: "Braces & Support" },
      { name: "useCases", label: "Use cases", type: "text", help: "Comma separated, e.g. Pain Relief, Recovery", wide: true },
      { name: "shortDescription", label: "Short description", type: "textarea", wide: true },
      { name: "description", label: "Full description", type: "richtext", wide: true },
      { name: "images", label: "Extra images", type: "images", wide: true },
      { name: "image", label: "Main image", type: "image", group: "side" },
      { name: "categoryId", label: "Pain area / category", type: "relation", relation: { model: "productCategories", labelField: "name", orderBy: "sortOrder" }, group: "side" },
      { name: "stock", label: "Stock (empty = unlimited)", type: "number", group: "side", nullable: true },
      { name: "active", label: "Active", type: "boolean", group: "side", defaultValue: true },
      { name: "featured", label: "Featured", type: "boolean", group: "side" },
      { name: "sortOrder", label: "Sort order", type: "number", group: "side" },
      ...seoFields(),
    ],
  },
  {
    key: "product-categories",
    model: "productCategories",
    label: "Product Categories",
    singular: "Product category",
    icon: "Tags",
    group: "Sales",
    counts: ["products"],
    columns: [{ field: "name", label: "Name" }, { field: "icon", label: "Icon" }, { field: "_count.products", label: "Products", type: "number" }, { field: "sortOrder", label: "Order", type: "number" }],
    searchFields: ["name"],
    orderBy: [{ sortOrder: "asc" }],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "slug", label: "Slug", type: "slug", from: "name" },
      { name: "description", label: "Description", type: "textarea", wide: true },
      { name: "icon", label: "Icon", type: "icon", group: "side" },
      { name: "sortOrder", label: "Sort order", type: "number", group: "side" },
      ...seoFields(),
    ],
  },
  {
    key: "orders",
    model: "orders",
    label: "Product Orders",
    singular: "Order",
    icon: "ShoppingBag",
    group: "Sales",
    canCreate: false,
    editPath: "/admin/orders/{id}",
    counts: ["items"],
    columns: [
      { field: "orderNumber", label: "Order" },
      { field: "customerName", label: "Customer" },
      { field: "email", label: "Email" },
      { field: "_count.items", label: "Items", type: "number" },
      { field: "totalCents", label: "Total", type: "money" },
      { field: "paymentMethod", label: "Method" },
      { field: "status", label: "Status", type: "badge" },
      { field: "createdAt", label: "Date", type: "date" },
    ],
    searchFields: ["orderNumber", "customerName", "email"],
    orderBy: [{ createdAt: "desc" }],
    filters: [{ field: "status", label: "Status", options: ORDER_STATUS }],
    fields: [],
  },

  // ============ Content ============
  {
    key: "posts",
    model: "blogPosts",
    label: "Blog Posts",
    singular: "Post",
    icon: "BookOpen",
    group: "Content",
    viewPath: "/blog/{slug}",
    with: { category: { columns: { name: true } } },
    columns: [
      { field: "coverImage", label: "", type: "image" },
      { field: "title", label: "Title" },
      { field: "category.name", label: "Category" },
      { field: "published", label: "Published", type: "boolean" },
      { field: "featured", label: "Helpful resource", type: "boolean" },
      { field: "views", label: "Views", type: "number" },
      { field: "publishedAt", label: "Date", type: "date" },
    ],
    searchFields: ["title", "excerpt"],
    orderBy: [{ createdAt: "desc" }],
    quickActions: [{ label: "Publish", field: "published", value: true, tone: "green" }],
    fields: [
      { name: "title", label: "Title", type: "text", required: true, wide: true },
      { name: "slug", label: "Slug", type: "slug", from: "title", wide: true },
      { name: "excerpt", label: "Excerpt", type: "textarea", wide: true },
      { name: "content", label: "Content", type: "richtext", required: true, wide: true },
      { name: "coverImage", label: "Cover image", type: "image", group: "side" },
      { name: "coverAlt", label: "Cover alt text", type: "text", group: "side" },
      { name: "categoryId", label: "Category", type: "relation", relation: { model: "blogCategories", labelField: "name", orderBy: "name" }, group: "side" },
      { name: "tags", label: "Tags", type: "relationMany", relation: { model: "blogTags", labelField: "name", orderBy: "name" }, group: "side" },
      { name: "authorName", label: "Author", type: "text", group: "side" },
      { name: "published", label: "Published", type: "boolean", group: "side" },
      { name: "publishedAt", label: "Publish date", type: "datetime", group: "side", help: "Set automatically when first published" },
      { name: "featured", label: "Show in “Helpful resources”", type: "boolean", group: "side" },
      ...seoFields(),
    ],
  },
  {
    key: "blog-categories",
    model: "blogCategories",
    label: "Blog Categories",
    singular: "Category",
    icon: "FolderOpen",
    group: "Content",
    viewPath: "/blog/category/{slug}",
    counts: ["posts"],
    columns: [{ field: "name", label: "Name" }, { field: "slug", label: "Slug" }, { field: "_count.posts", label: "Posts", type: "number" }],
    searchFields: ["name"],
    orderBy: [{ name: "asc" }],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "slug", label: "Slug", type: "slug", from: "name" },
      { name: "description", label: "Description", type: "textarea", wide: true },
      ...seoFields(),
    ],
  },
  {
    key: "blog-tags",
    model: "blogTags",
    label: "Blog Tags",
    singular: "Tag",
    icon: "Tag",
    group: "Content",
    viewPath: "/blog/tag/{slug}",
    counts: ["posts"],
    columns: [{ field: "name", label: "Name" }, { field: "slug", label: "Slug" }, { field: "_count.posts", label: "Posts", type: "number" }],
    searchFields: ["name"],
    orderBy: [{ name: "asc" }],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "slug", label: "Slug", type: "slug", from: "name" },
    ],
  },
  {
    key: "comments",
    model: "blogComments",
    label: "Blog Comments",
    singular: "Comment",
    icon: "MessageSquare",
    group: "Content",
    canCreate: false,
    with: { post: { columns: { title: true } } },
    columns: [
      { field: "name", label: "Name" },
      { field: "body", label: "Comment" },
      { field: "post.title", label: "Post" },
      { field: "status", label: "Status", type: "badge" },
      { field: "createdAt", label: "Date", type: "date" },
    ],
    searchFields: ["name", "email", "body"],
    orderBy: [{ createdAt: "desc" }],
    filters: [{ field: "status", label: "Status", options: MODERATION }],
    quickActions: [
      { label: "Approve", field: "status", value: "APPROVED", tone: "green" },
      { label: "Reject", field: "status", value: "REJECTED", tone: "red" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "body", label: "Comment", type: "textarea", wide: true },
      { name: "status", label: "Status", type: "select", options: MODERATION, group: "side" },
    ],
  },
  {
    key: "pages",
    model: "cmsPages",
    label: "Pages",
    singular: "Page",
    icon: "FileText",
    group: "Content",
    description: "About, Privacy, Terms, Help Center… served at /{slug}. Choose a footer column to link the page in the footer.",
    viewPath: "/{slug}",
    columns: [{ field: "title", label: "Title" }, { field: "slug", label: "URL" }, { field: "footerGroup", label: "Footer" }, { field: "published", label: "Published", type: "boolean" }, { field: "updatedAt", label: "Updated", type: "date" }],
    searchFields: ["title", "slug"],
    orderBy: [{ sortOrder: "asc" }],
    fields: [
      { name: "title", label: "Title", type: "text", required: true, wide: true },
      { name: "slug", label: "URL slug", type: "slug", from: "title", wide: true },
      { name: "excerpt", label: "Summary", type: "textarea", wide: true },
      { name: "content", label: "Content", type: "richtext", required: true, wide: true },
      { name: "heroImage", label: "Header image", type: "image", group: "side" },
      { name: "published", label: "Published", type: "boolean", group: "side", defaultValue: true },
      { name: "footerGroup", label: "Footer column", type: "select", options: [{ value: "company", label: "Company column" }, { value: "providers", label: "For Providers column" }], group: "side" },
      { name: "sortOrder", label: "Sort order", type: "number", group: "side" },
      ...seoFields(),
    ],
  },
  {
    key: "seo",
    model: "pageSeo",
    label: "SEO – Fixed Pages",
    singular: "Page SEO",
    icon: "Globe",
    group: "Content",
    description: "Meta title, description, keywords and social share (Open Graph) image for each fixed page.",
    canCreate: false,
    canDelete: false,
    columns: [{ field: "label", label: "Page" }, { field: "pageKey", label: "Key" }, { field: "metaTitle", label: "Meta title" }, { field: "noIndex", label: "No-index", type: "boolean" }],
    searchFields: ["label", "pageKey"],
    orderBy: [{ id: "asc" }],
    fields: [
      { name: "label", label: "Page", type: "text", readOnly: true },
      { name: "metaTitle", label: "Meta title", type: "text", wide: true },
      { name: "metaDescription", label: "Meta description", type: "textarea", wide: true },
      { name: "metaKeywords", label: "Meta keywords", type: "text", wide: true, help: "Comma separated" },
      { name: "ogTitle", label: "Social share title", type: "text", wide: true },
      { name: "ogDescription", label: "Social share description", type: "textarea", wide: true },
      { name: "canonical", label: "Canonical URL (optional)", type: "url", wide: true },
      { name: "ogImage", label: "Social share image (1200×630)", type: "image", group: "side" },
      { name: "noIndex", label: "Hide from search engines", type: "boolean", group: "side" },
    ],
  },

  // ============ Site sections ============
  {
    key: "popular-searches",
    model: "popularSearches",
    label: "Popular Ways to Find Care",
    singular: "Popular search",
    icon: "Search",
    group: "Home page",
    with: { condition: { columns: { name: true } }, specialty: { columns: { name: true } } },
    columns: [{ field: "label", label: "Label" }, { field: "providerType", label: "Type", type: "badge" }, { field: "condition.name", label: "Condition" }, { field: "specialty.name", label: "Specialty" }, { field: "active", label: "Active", type: "boolean" }, { field: "sortOrder", label: "Order", type: "number" }],
    searchFields: ["label"],
    orderBy: [{ sortOrder: "asc" }],
    fields: [
      { name: "label", label: "Label", type: "text", required: true, wide: true },
      { name: "providerType", label: "Provider type", type: "select", options: PROVIDER_TYPES },
      { name: "conditionId", label: "Condition", type: "relation", relation: { model: "conditions", labelField: "name", orderBy: "sortOrder" } },
      { name: "specialtyId", label: "Specialty", type: "relation", relation: { model: "specialties", labelField: "name", orderBy: "sortOrder" } },
      { name: "query", label: "Free-text query (if no condition/specialty)", type: "text" },
      { name: "active", label: "Active", type: "boolean", group: "side", defaultValue: true },
      { name: "sortOrder", label: "Sort order", type: "number", group: "side" },
    ],
  },
  {
    key: "blocks",
    model: "contentBlocks",
    label: "Content Blocks",
    singular: "Content block",
    icon: "LayoutGrid",
    group: "Home page",
    description: "Small repeatable items: home stats, hero badges, claim steps, “why claim” items, product trust badges and tips.",
    columns: [{ field: "section", label: "Section", type: "badge" }, { field: "icon", label: "Icon" }, { field: "title", label: "Title" }, { field: "text", label: "Text" }, { field: "active", label: "Active", type: "boolean" }, { field: "sortOrder", label: "Order", type: "number" }],
    searchFields: ["title", "text", "section"],
    orderBy: [{ section: "asc" }, { sortOrder: "asc" }],
    filters: [
      {
        field: "section",
        label: "Section",
        options: [
          { value: "home_stats", label: "Home – stats bar" },
          { value: "home_hero_badges", label: "Home – hero badges" },
          { value: "claim_steps", label: "Claim – steps" },
          { value: "claim_why", label: "Claim – why claim" },
          { value: "products_trust", label: "Products – trust badges" },
          { value: "products_howto", label: "Products – how to choose" },
        ],
      },
    ],
    fields: [
      {
        name: "section",
        label: "Section",
        type: "select",
        required: true,
        options: [
          { value: "home_stats", label: "Home – stats bar" },
          { value: "home_hero_badges", label: "Home – hero badges" },
          { value: "claim_steps", label: "Claim – steps" },
          { value: "claim_why", label: "Claim – why claim" },
          { value: "products_trust", label: "Products – trust badges" },
          { value: "products_howto", label: "Products – how to choose" },
        ],
      },
      { name: "title", label: "Title", type: "text", required: true },
      { name: "text", label: "Text", type: "textarea", wide: true },
      { name: "link", label: "Link (optional)", type: "text" },
      { name: "icon", label: "Icon", type: "icon", group: "side" },
      { name: "active", label: "Active", type: "boolean", group: "side", defaultValue: true },
      { name: "sortOrder", label: "Sort order", type: "number", group: "side" },
    ],
  },
  {
    key: "testimonials",
    model: "testimonials",
    label: "Testimonials",
    singular: "Testimonial",
    icon: "UserCheck",
    group: "Home page",
    description: "Provider reviews shown on the Claim Your Profile page.",
    columns: [{ field: "avatar", label: "", type: "image" }, { field: "name", label: "Name" }, { field: "role", label: "Role" }, { field: "rating", label: "Rating", type: "stars" }, { field: "active", label: "Active", type: "boolean" }],
    searchFields: ["name", "quote"],
    orderBy: [{ sortOrder: "asc" }],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "role", label: "Role", type: "text" },
      { name: "location", label: "Location", type: "text" },
      { name: "quote", label: "Quote", type: "textarea", required: true, wide: true },
      { name: "rating", label: "Rating (1–5)", type: "number", defaultValue: 5 },
      { name: "avatar", label: "Photo", type: "image", group: "side" },
      { name: "page", label: "Show on", type: "select", options: [{ value: "claim", label: "Claim your profile page" }], group: "side", defaultValue: "claim" },
      { name: "active", label: "Active", type: "boolean", group: "side", defaultValue: true },
      { name: "sortOrder", label: "Sort order", type: "number", group: "side" },
    ],
  },

  // ============ System ============
  {
    key: "users",
    model: "users",
    label: "Users",
    singular: "User",
    icon: "Users",
    group: "System",
    with: { provider: { columns: { firstName: true, lastName: true } } },
    columns: [{ field: "name", label: "Name" }, { field: "email", label: "Email" }, { field: "role", label: "Role", type: "badge" }, { field: "provider.firstName+provider.lastName", label: "Provider" }, { field: "lastLoginAt", label: "Last login", type: "date" }],
    searchFields: ["name", "email"],
    orderBy: [{ id: "desc" }],
    filters: [{ field: "role", label: "Role", options: opt("ADMIN", "PROVIDER") }],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "password", label: "Password", type: "password", help: "Leave empty to keep the current password" },
      { name: "role", label: "Role", type: "select", options: opt("ADMIN", "PROVIDER"), required: true, group: "side", defaultValue: "PROVIDER" },
      { name: "providerId", label: "Linked provider profile", type: "relation", relation: { model: "providers", labelField: "firstName+lastName", orderBy: "lastName" }, group: "side" },
      { name: "googleId", label: "Google account ID", type: "text", group: "side", help: "Filled automatically on first Google sign-in" },
      { name: "facebookId", label: "Facebook account ID", type: "text", group: "side", help: "Filled automatically on first Facebook sign-in" },
    ],
  },
];

export function getResource(key: string) {
  return RESOURCES.find((r) => r.key === key);
}

/** Admin sidebar groups (resource keys in order) */
export const RESOURCE_GROUPS = [...new Set(RESOURCES.map((r) => r.group))];
