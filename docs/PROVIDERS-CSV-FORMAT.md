# Provider CSV format

Use this format to import doctors in **Admin → Import Providers (CSV)**. Download a ready-to-fill template from that page, or use `providers-import-template.csv`.

## Rules

- Save the file as **CSV UTF-8** (Excel: *File → Save As → CSV UTF-8*; Google Sheets: *File → Download → CSV*).
- The first row holds the column names. Order doesn't matter; unknown columns are ignored; you can leave out columns you don't use.
- **Lists** use a vertical bar: `Back Pain|Neck Pain|Sciatica`.
- **Yes/no** columns accept `yes/no`, `true/false`, `1/0`, `y/n`.
- **Several locations for one doctor:** fill in `slug` and add one extra row per location with the same slug. Extra rows only need the location columns.
- **Updating:** rows are matched to existing doctors by `slug`, then by `email`. Empty cells never erase existing data. Tip: *Export all providers*, edit, and import again.
- Always click **Check file** first — nothing is saved until you click **Import**. Rows with errors are skipped and listed with their row number.
- Required for **new** doctors: `first_name`, `last_name`, `provider_type`, `address`, `city`, `state_code`, `zip` (marked ✱).


## Profile

| Column | Description | Example |
|---|---|---|
| `slug` | Profile URL id (/provider/{slug}). Leave empty to create a new provider – it's generated from the name and city. Fill it to update an existing provider, or to add more locations (repeat the slug on extra rows). | `dr-amelia-stone-austin` |
| `prefix` | Title before the name. | `Dr.` |
| `first_name` ✱ | Required for new providers. | `Amelia` |
| `last_name` ✱ | Required for new providers. | `Stone` |
| `credentials` | Shown after the name. | `PT, DPT` |
| `provider_type` ✱ | PT (Physical Therapist) or Chiropractor. Also accepts PHYSICAL_THERAPIST / CHIROPRACTOR / DC. | `PT` |
| `headline` | Title under the name. Defaults to the provider type. | `Sports Physical Therapist` |
| `practice_name` | Practice name | `Stone Physical Therapy` |
| `bio` | Plain text; line breaks are kept. | `Dr. Stone helps runners and desk workers recover from pain…` |
| `quote` | Quote | `My goal is to help you move without pain.` |
| `gender` | Female, Male or Non-binary (used by the search filter). | `Female` |
| `languages` | List separated by \| | `English\|Spanish` |
| `education` | Education | `University of Southern California` |
| `years_experience` | Whole number. | `12` |
| `photo_url` | Full https:// link or a path from the media library (/uploads/…). | `https://example.com/photos/amelia-stone.jpg` |
| `gallery_urls` | List separated by \|. Replaces the gallery when filled. | `https://example.com/c1.jpg\|https://example.com/c2.jpg` |

## Contact

| Column | Description | Example |
|---|---|---|
| `email` | Receives appointment requests and messages. Also used to match existing providers when slug is empty. | `amelia.stone@stonept.example.com` |
| `phone` | Hidden on the profile until a visitor clicks Call. | `(512) 555-0142` |
| `website` | Website | `https://www.stonept.example.com` |

## License

| Column | Description | Example |
|---|---|---|
| `license_number` | License number | `TX-123456` |
| `license_state` | License state | `TX` |
| `license_verified` | yes/no – shows the “License verified” badge. | `yes` |

## Services

| Column | Description | Example |
|---|---|---|
| `conditions` | Names or slugs separated by \|. Unknown ones are created if “create missing” is ticked. | `Back Pain\|Neck Pain\|Sciatica` |
| `specialties` | Names or slugs separated by \|. | `Manual Therapy\|Dry Needling` |
| `insurances` | Names or slugs separated by \|. | `Aetna\|Blue Cross Blue Shield\|Medicare` |
| `accepting_new_patients` | yes/no (default yes). | `yes` |
| `in_person` | yes/no (default yes). | `yes` |
| `telehealth` | yes/no (default no). | `no` |
| `office_hours` | day=HH:MM-HH:MM separated by ; (24-hour). Days you leave out are closed. Empty = default hours (Mon–Fri 8–6, Sat 9–1). | `mon=08:00-18:00;tue=08:00-18:00;wed=08:00-18:00;thu=08:00-18:00;fri=08:00-17:00;sat=09:00-13:00;sun=closed` |

## Location

| Column | Description | Example |
|---|---|---|
| `location_name` | Defaults to the practice name. | `Stone PT – Downtown` |
| `address` ✱ | Required for new providers. | `1311 Main Street` |
| `address2` | Suite / floor | `Suite 200` |
| `city` ✱ | Matched to a city in Admin → Cities (by name + state code). | `Austin` |
| `state_code` ✱ | 2-letter state code. | `TX` |
| `zip` ✱ | ZIP | `78701` |
| `lat` | Optional. Empty = the city's map position. Needed to create a new city automatically. | `30.2672` |
| `lng` | Optional (see latitude). | `-97.7431` |
| `location_phone` | Optional phone for this location. | `(512) 555-0199` |

## Listing

| Column | Description | Example |
|---|---|---|
| `claim_status` | UNCLAIMED (default), CLAIMED or PENDING. Unclaimed profiles always rank last in search. | `UNCLAIMED` |
| `plan` | Plan slug from Admin → Plans (free, pro, featured…). Paid plans rank first. | `pro` |
| `plan_expires` | YYYY-MM-DD. Empty = never. | `2027-12-31` |
| `featured` | yes/no – show in “Featured Providers”. | `no` |
| `status` | ACTIVE (default) or INACTIVE (hidden from the site). | `ACTIVE` |

## Social & video

| Column | Description | Example |
|---|---|---|
| `facebook_url` | Shown on paid plans. | `https://facebook.com/stonept` |
| `x_url` | X (Twitter) | `https://x.com/stonept` |
| `linkedin_url` | LinkedIn | `https://linkedin.com/in/ameliastone` |
| `pinterest_url` | Pinterest |  |
| `youtube_url` | YouTube | `https://youtube.com/@stonept` |
| `instagram_url` | Instagram |  |
| `video_url` | YouTube/Vimeo link or an .mp4 URL. | `https://www.youtube.com/watch?v=dQw4w9WgXcQ` |

## SEO

| Column | Description | Example |
|---|---|---|
| `meta_title` | Empty = generated automatically. |  |
| `meta_description` | Meta description |  |
| `meta_keywords` | Comma separated. |  |
