/**
 * PROVIDER CSV FORMAT – the single source of truth.
 * ------------------------------------------------------------------
 * Used by the importer, the exporter, the downloadable template and the
 * column guide in Admin → Import Providers. Plain data (no server code),
 * so it can also be shown in the browser.
 *
 * Rules (also shown to admins):
 *  - First row = column names (order doesn't matter, extra columns are ignored).
 *  - Lists use a vertical bar:  Back Pain|Neck Pain|Sciatica
 *  - Yes/no columns accept: yes/no, true/false, 1/0, y/n.
 *  - Several rows with the SAME slug = one provider with several locations
 *    (the extra rows only need the location columns).
 *  - Existing providers are matched by slug (then by email) and updated;
 *    empty cells never erase existing data.
 */

export type CsvColumn = {
  key: string;
  label: string;
  required?: boolean;
  example: string;
  help: string;
  group: "Profile" | "Contact" | "License" | "Services" | "Location" | "Listing" | "Social & video" | "SEO";
};

export const PROVIDER_CSV_COLUMNS: CsvColumn[] = [
  // ── Profile ──
  { key: "slug", label: "Slug", example: "dr-amelia-stone-austin", group: "Profile", help: "Profile URL id (/provider/{slug}). Leave empty to create a new provider – it's generated from the name and city. Fill it to update an existing provider, or to add more locations (repeat the slug on extra rows)." },
  { key: "prefix", label: "Prefix", example: "Dr.", group: "Profile", help: "Title before the name." },
  { key: "first_name", label: "First name", required: true, example: "Amelia", group: "Profile", help: "Required for new providers." },
  { key: "last_name", label: "Last name", required: true, example: "Stone", group: "Profile", help: "Required for new providers." },
  { key: "credentials", label: "Credentials", example: "PT, DPT", group: "Profile", help: "Shown after the name." },
  { key: "provider_type", label: "Provider type", required: true, example: "PT", group: "Profile", help: "PT (Physical Therapist) or Chiropractor. Also accepts PHYSICAL_THERAPIST / CHIROPRACTOR / DC." },
  { key: "headline", label: "Headline", example: "Sports Physical Therapist", group: "Profile", help: "Title under the name. Defaults to the provider type." },
  { key: "practice_name", label: "Practice name", example: "Stone Physical Therapy", group: "Profile", help: "" },
  { key: "bio", label: "Biography", example: "Dr. Stone helps runners and desk workers recover from pain…", group: "Profile", help: "Plain text; line breaks are kept." },
  { key: "quote", label: "Quote", example: "My goal is to help you move without pain.", group: "Profile", help: "" },
  { key: "gender", label: "Gender", example: "Female", group: "Profile", help: "Female, Male or Non-binary (used by the search filter)." },
  { key: "languages", label: "Languages", example: "English|Spanish", group: "Profile", help: "List separated by |" },
  { key: "education", label: "Education", example: "University of Southern California", group: "Profile", help: "" },
  { key: "years_experience", label: "Years of experience", example: "12", group: "Profile", help: "Whole number." },
  { key: "photo_url", label: "Photo URL", example: "https://example.com/photos/amelia-stone.jpg", group: "Profile", help: "Full https:// link or a path from the media library (/uploads/…)." },
  { key: "gallery_urls", label: "Gallery photo URLs", example: "https://example.com/c1.jpg|https://example.com/c2.jpg", group: "Profile", help: "List separated by |. Replaces the gallery when filled." },
  // ── Contact ──
  { key: "email", label: "Email", example: "amelia.stone@stonept.example.com", group: "Contact", help: "Receives appointment requests and messages. Also used to match existing providers when slug is empty." },
  { key: "phone", label: "Phone", example: "(512) 555-0142", group: "Contact", help: "Hidden on the profile until a visitor clicks Call." },
  { key: "website", label: "Website", example: "https://www.stonept.example.com", group: "Contact", help: "" },
  // ── License ──
  { key: "license_number", label: "License number", example: "TX-123456", group: "License", help: "" },
  { key: "license_state", label: "License state", example: "TX", group: "License", help: "" },
  { key: "license_verified", label: "License verified", example: "yes", group: "License", help: "yes/no – shows the “License verified” badge." },
  // ── Services ──
  { key: "conditions", label: "Conditions treated", example: "Back Pain|Neck Pain|Sciatica", group: "Services", help: "Names or slugs separated by |. Unknown ones are created if “create missing” is ticked." },
  { key: "specialties", label: "Treatments / specialties", example: "Manual Therapy|Dry Needling", group: "Services", help: "Names or slugs separated by |." },
  { key: "insurances", label: "Insurance accepted", example: "Aetna|Blue Cross Blue Shield|Medicare", group: "Services", help: "Names or slugs separated by |." },
  { key: "accepting_new_patients", label: "Accepting new patients", example: "yes", group: "Services", help: "yes/no (default yes)." },
  { key: "in_person", label: "In-person visits", example: "yes", group: "Services", help: "yes/no (default yes)." },
  { key: "telehealth", label: "Telehealth", example: "no", group: "Services", help: "yes/no (default no)." },
  { key: "office_hours", label: "Office hours", example: "mon=08:00-18:00;tue=08:00-18:00;wed=08:00-18:00;thu=08:00-18:00;fri=08:00-17:00;sat=09:00-13:00;sun=closed", group: "Services", help: "day=HH:MM-HH:MM separated by ; (24-hour). Days you leave out are closed. Empty = default hours (Mon–Fri 8–6, Sat 9–1)." },
  // ── Location ──
  { key: "location_name", label: "Location name", example: "Stone PT – Downtown", group: "Location", help: "Defaults to the practice name." },
  { key: "address", label: "Street address", required: true, example: "1311 Main Street", group: "Location", help: "Required for new providers." },
  { key: "address2", label: "Suite / floor", example: "Suite 200", group: "Location", help: "" },
  { key: "city", label: "City", required: true, example: "Austin", group: "Location", help: "Matched to a city in Admin → Cities (by name + state code)." },
  { key: "state_code", label: "State code", required: true, example: "TX", group: "Location", help: "2-letter state code." },
  { key: "zip", label: "ZIP", required: true, example: "78701", group: "Location", help: "" },
  { key: "lat", label: "Latitude", example: "30.2672", group: "Location", help: "Optional. Empty = the city's map position. Needed to create a new city automatically." },
  { key: "lng", label: "Longitude", example: "-97.7431", group: "Location", help: "Optional (see latitude)." },
  { key: "location_phone", label: "Location phone", example: "(512) 555-0199", group: "Location", help: "Optional phone for this location." },
  // ── Listing ──
  { key: "claim_status", label: "Claim status", example: "UNCLAIMED", group: "Listing", help: "UNCLAIMED (default), CLAIMED or PENDING. Unclaimed profiles always rank last in search." },
  { key: "plan", label: "Plan", example: "pro", group: "Listing", help: "Plan slug from Admin → Plans (free, pro, featured…). Paid plans rank first." },
  { key: "plan_expires", label: "Plan expires", example: "2027-12-31", group: "Listing", help: "YYYY-MM-DD. Empty = never." },
  { key: "featured", label: "Featured on home", example: "no", group: "Listing", help: "yes/no – show in “Featured Providers”." },
  { key: "status", label: "Status", example: "ACTIVE", group: "Listing", help: "ACTIVE (default) or INACTIVE (hidden from the site)." },
  // ── Social & video ──
  { key: "facebook_url", label: "Facebook", example: "https://facebook.com/stonept", group: "Social & video", help: "Shown on paid plans." },
  { key: "x_url", label: "X (Twitter)", example: "https://x.com/stonept", group: "Social & video", help: "" },
  { key: "linkedin_url", label: "LinkedIn", example: "https://linkedin.com/in/ameliastone", group: "Social & video", help: "" },
  { key: "pinterest_url", label: "Pinterest", example: "", group: "Social & video", help: "" },
  { key: "youtube_url", label: "YouTube", example: "https://youtube.com/@stonept", group: "Social & video", help: "" },
  { key: "instagram_url", label: "Instagram", example: "", group: "Social & video", help: "" },
  { key: "video_url", label: "Intro video", example: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", group: "Social & video", help: "YouTube/Vimeo link or an .mp4 URL." },
  // ── SEO ──
  { key: "meta_title", label: "Meta title", example: "", group: "SEO", help: "Empty = generated automatically." },
  { key: "meta_description", label: "Meta description", example: "", group: "SEO", help: "" },
  { key: "meta_keywords", label: "Meta keywords", example: "", group: "SEO", help: "Comma separated." },
];

export const CSV_KEYS = PROVIDER_CSV_COLUMNS.map((c) => c.key);
