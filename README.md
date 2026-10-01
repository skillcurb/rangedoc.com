# RangeDoc — Physical Therapist & Chiropractor Directory

A complete, city-based healthcare provider directory built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS 4**, **Prisma 7** and **MySQL**.

Visitors search for licensed Physical Therapists and Chiropractors by pain area and location, compare providers, and contact them (appointment request, call, email, website). Providers claim their profiles (free or paid plans) and manage everything from their dashboard. Admins control all content, pricing, SEO, payments and analytics from `/admin`.

---

## 1. Quick start

### Requirements
- **Node.js 20.19+** (22 LTS recommended)
- **MySQL 8.0+** or **MariaDB 10.6+** (local, Docker, cPanel hosting, or hosted: PlanetScale, AWS RDS, DigitalOcean, Railway…)

### Install
```bash
# 1. Install packages (also generates the Prisma client)
npm install

# 2. Create your environment file and edit it
cp .env.example .env
#    DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/rangedoc"
#    (special characters in the password must be URL-encoded, e.g. @ → %40;
#     hosted databases that require TLS: add  ?ssl=true  at the end)
#    AUTH_SECRET=<long random string>   (run: openssl rand -base64 48)
#    NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# 3. Create an empty UTF-8 database first, e.g. in the mysql client / phpMyAdmin:
#    CREATE DATABASE rangedoc CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
#    (or with Docker:  docker run -d --name rangedoc-db -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=rangedoc -p 3306:3306 mysql:8.4)

# 4. Create the tables and load demo content
npm run setup          # = prisma generate + prisma db push + prisma db seed

# 5. Run it
npm run dev            # http://localhost:3000
```

### Demo logins (created by the seed)
| Area | URL | Email | Password |
|---|---|---|---|
| Admin | `/admin/login` | `admin@rangedoc.com` | `Admin@12345` |
| Provider (Pro plan, Dr. Sarah Kim) | `/login` | `provider@rangedoc.com` | `Provider@123` |

Change the admin email/password with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env` **before** seeding, or later in Admin → Users.

> ⚠️ `npm run db:seed` **clears the demo tables** before inserting. Run it only on a fresh database. It keeps admin accounts.

### Production
```bash
npm run build
npm start              # or run behind PM2 / systemd / Docker
```
- Set `NEXT_PUBLIC_SITE_URL` to your real domain (used for SEO canonical URLs, sitemap, emails and payment return URLs).
- Uploaded files are saved in `storage/uploads` (change with `UPLOAD_DIR`). **Keep this folder on persistent disk and back it up.** On serverless hosts without a disk, switch `src/lib/uploads.ts` to S3/Cloudflare R2.
- Database tables are created from `prisma/schema.prisma` by `npm run setup` (`prisma db push`). If you prefer versioned migrations, run `npm run db:migrate -- --name init` once in development (creates `prisma/migrations`), then use `npm run db:deploy` on each release. When you change `schema.prisma`, run `npm run db:push` (or `db:migrate`).

---

## 2. After installing — configure in Admin → Settings

| Tab | What to set |
|---|---|
| General & Branding | Site name, logo, favicon, default share image, contact details |
| Payments | **Stripe** (Visa / Mastercard / Amex via Stripe Checkout) and **PayPal** keys; enable/disable “Pay later / invoice” |
| Email (SMTP) | SMTP host, user, password, “from” address, admin notification email. Until set, emails are printed to the server console. |
| reCAPTCHA | Google reCAPTCHA **v2 checkbox** site key + secret (protects the Contact page) |
| Social login | “Continue with Google / Facebook” for admins (see section 2b) |
| Analytics & SEO | Google Analytics 4, Google Tag Manager, **Microsoft Clarity** (Bing's analytics), Bing UET tag, **Google Search Console** and **Bing Webmaster Tools** verification codes, IndexNow on/off |
| Home / Claim page / Marketplace | All headings, hero images and texts |
| Search | Default radius and cards loaded per scroll |
| Scripts | Google Analytics ID (optional) |

### 2b. Admin password & Google / Facebook sign-in
- **Change your password**: Admin → **My Account** (also in the user menu, top right). Other admins' passwords can be reset in Admin → Users.
- **Sign in with Google**: create an OAuth client (type *Web application*) in Google Cloud Console → APIs & Services → Credentials. Add the redirect URL `https://YOUR-DOMAIN/api/auth/oauth/google/callback`, then paste the client ID/secret in Admin → Settings → **Social login** and switch it on.
- **Sign in with Facebook**: create an app at developers.facebook.com → add *Facebook Login* → valid OAuth redirect URI `https://YOUR-DOMAIN/api/auth/oauth/facebook/callback`, then paste the App ID/secret in the same settings tab.
- Only people whose Google/Facebook email already belongs to an **admin user** can sign in this way (the account is linked on first sign-in). Nobody can create an admin account through social login.

### 2c. Google & Bing (analytics, Search Console, sitemap)
1. Admin → Settings → **Analytics & SEO**: paste your GA4 ID, (optional) GTM ID, Microsoft Clarity ID and Bing UET tag, plus the **HTML-tag verification codes** from Google Search Console and Bing Webmaster Tools. Scripts load only on public pages (never in admin/dashboard).
2. Verify the site in both tools, then submit `https://YOUR-DOMAIN/sitemap.xml` once in each.
3. **The sitemap regenerates automatically whenever you save anything** (providers, cities, conditions, blog posts, products, pages, settings, provider dashboard edits, new registrations). It includes `lastmod` dates and image entries for Google Images. After every save, Bing, Yandex and other IndexNow engines are notified instantly; Google re-reads the submitted sitemap on its own. Status and a “Regenerate & notify now” button are in Admin → **Sitemap & Indexing**.

---

### 2d. Import doctors from a CSV file
Admin → **Import Providers (CSV)** adds or updates many doctors at once:
1. Click **Download template** (also in this project: `docs/providers-import-template.csv`), fill it in with Excel or Google Sheets, and save as **CSV UTF-8**. The full column reference is in `docs/PROVIDERS-CSV-FORMAT.md` and on the import page.
2. Upload the file and click **Check file**. Every row is validated (provider type, email, cities, plans, office hours, links…) and problems are listed by row number. Nothing is saved yet.
3. Click **Import**. Valid rows are saved; rows with errors are skipped. The sitemap is regenerated and search engines are notified.

Good to know:
- One row per doctor. A doctor with several offices = several rows with the same `slug`.
- Existing doctors are matched by `slug`, then `email`, and updated; empty cells never erase data. **Export all providers → edit → import** is the easiest bulk-edit workflow (the export uses the same format).
- Options: create missing conditions/treatments/insurances, create missing cities (needs lat/lng), and turn updating of existing doctors on/off.
- Up to 15 MB per file (tens of thousands of doctors); split larger files.

---

## 3. What's included

### Public website (all with SEO meta tags, keywords, Open Graph / Twitter cards, JSON-LD, sitemap.xml, robots.txt)
| Page | Highlights |
|---|---|
| `/` Home | Provider-type tabs, pain autocomplete, City/ZIP autocomplete **auto-filled from the visitor's location**, stats bar, “Where does it hurt?” carousel, Popular ways to find care, Find care near you, Featured providers, Helpful resources — **all managed in admin**, each section streamed with Suspense + skeletons |
| `/search`, `/providers` | Filters (type, distance, insurance, condition, specialty, telehealth…), facet counts, **ranking: paid plans first → claimed free → unclaimed always last**, “% match” + “why this matches you”, **infinite scroll**, skeleton cards, Leaflet map that follows the selected card (first result by default), mobile map toggle |
| `/provider/{slug}` | Paid profiles: social links (Facebook, X, LinkedIn, Pinterest, YouTube, Instagram), intro video and **video gallery**. Request appointment popup (real available dates/times from office hours), **hidden phone revealed on click**, Email provider popup (saved to provider inbox + emailed), Visit website (tracked, adds UTM source), gallery lightbox (“see all photos”), locations + map + directions, office hours, conditions/treatments/insurance, ratings & reviews, FAQs with “View all”, Save & Share (paid features) |
| `/claim-your-profile` | Find-your-profile search, steps, why-claim, pricing from admin, testimonials |
| `/register`, `/login`, `/forgot-password` | Create a new listing **or** claim an existing one (admin verifies claims) |
| `/checkout/plan/{slug}` | Plan purchase: minimum details + Stripe / PayPal / pay-later |
| `/products`, `/products/{slug}`, `/cart`, `/checkout` | Recovery Marketplace with pain-area filters; **guest checkout, no account needed** |
| `/blog`, `/blog/{slug}`, `/blog/category/{slug}`, `/blog/tag/{slug}` | Articles, categories, tags, star ratings, moderated comments, share buttons |
| `/conditions`, `/locations` (+ detail pages) | SEO landing pages per condition and per city |
| `/contact` | Google reCAPTCHA-protected contact form |
| `/{slug}` | CMS pages (About, Privacy, Terms, Help Center…) — add any page in admin |
| `/saved` | Providers the visitor saved |

### Provider dashboard (`/dashboard`)
Overview (profile views, website/call clicks, email inquiries, chart, top searched conditions, recent leads, profile completeness), Profile, Locations (map pin picker), Photos & Media, **Videos & Social** (intro video, video gallery from YouTube/Vimeo links or uploaded MP4s, social network links), FAQs, Availability (office hours → appointment slots), Appointments, Messages, Reviews, Analytics, Billing & Plan, Settings. Features unlock according to the plan (see below). Claims waiting for verification see a “being verified” screen.

### Admin panel (`/admin`, login at `/admin/login`)
- **Import Providers (CSV)**: bulk import/update doctors with validation and row-by-row errors; template download and full export.
- **My Account**: change your name, email, photo and password; link/unlink Google & Facebook sign-in.
- **Sitemap & Indexing**: last regeneration time, URL/image counts, search-engine notification status.
- **Dashboard & Analytics**: visitors, new vs returning, visits per visitor, pages, searches, devices, browsers, OS, visitor cities/countries, top pages, top provider profiles with every interaction (photo views, gallery, appointment, call, email, website), recent visitors.
- **Profile claims**: approve / reject (provider is emailed).
- **Media Library** (WordPress-style): drag-and-drop upload of PNG, JPG, WebP, GIF, SVG, ICO, MP4/WebM/MOV, PDF; alt text/title editing; the same library opens as a **popup picker** from every image field and inside the blog/page rich-text editor.
- **Directory**: providers, locations, **cities (added with a clickable map for lat/lng)**, conditions, specialties, insurances, FAQs.
- **Leads**: appointment requests, provider emails, reviews (approve/reject), contact messages.
- **Sales**: plans & pricing (with capability switches), plan orders (“Mark paid” activates the plan), products, product categories, product orders.
- **Content**: blog posts (rich-text editor), categories, tags, comments, CMS pages, **SEO for every fixed page** (title, description, keywords, OG title/description/image, canonical, no-index).
- **Home page sections**: popular searches, content blocks (stats, badges, claim steps, why-claim, product tips), testimonials.
- **Users**, **Site settings**.

### Plans control what providers can do (Admin → Plans & Pricing)
| Capability | Unclaimed | Free (seed) | Pro (seed) |
|---|---|---|---|
| Search placement | always last | after paid | top (by search priority) |
| Gallery photos | 4 | 5 | unlimited |
| Locations | 1 | 1 | 10 |
| FAQs / “View all FAQs” | 3 / no | 3 / no | 50 / yes |
| Reviews + star rating, Save & Share, full analytics | – | – | ✓ |
| Intro video / video gallery | – | – | ✓ / 6 videos |
| Social network links | – | – | ✓ |

All numbers and switches are editable per plan.

---

## 4. How things work (for developers)

```
prisma/schema.prisma        Data model (MySQL, utf8mb4). Money stored as integer cents.
prisma/seed.ts              Demo content
prisma.config.ts            Prisma 7 config (DB URL, seed command)
src/proxy.ts                Next 16 "proxy" (middleware): protects /admin & /dashboard, sets visitor cookie
src/app/(site)/…            Public pages (shared header/footer)
src/app/dashboard/…         Provider dashboard
src/app/admin/(auth)/login  Admin login
src/app/admin/(panel)/…     Admin pages; /admin/r/[resource] is the generic list/edit UI
src/app/api/…               Search, suggestions, tracking, media, availability, payments
src/lib/admin/resources.ts  ⭐ One config entry per admin section (fields, columns, filters)
src/lib/search.ts           Search + ranking + facets + distance
src/lib/plans.ts            Plan feature gating
src/lib/analytics.ts        Event recording and reports
src/lib/sitemap.ts          Sitemap builder + auto-regeneration + IndexNow pings
src/lib/oauth.ts            Admin Google / Facebook sign-in
src/lib/video.ts            YouTube / Vimeo / MP4 link parsing
src/lib/providers-csv*.ts   Provider CSV import / export (column spec + engine)
docs/                       CSV template + CSV format guide for importing doctors
src/lib/uploads.ts          File storage (providers/{id}/profile, providers/{id}/gallery, media/YYYY/MM)
src/lib/payments/…          Stripe + PayPal + order fulfilment
src/lib/actions/…           Server actions (forms)
src/components/…            UI (site, profile, search, dashboard, admin, media library, editor)
```

- **Add a new admin section**: add the model to `schema.prisma`, run `npm run db:push` (or `db:migrate`), then add one entry to `src/lib/admin/resources.ts`. The list, search, filters, create/edit form, media picker and delete all work automatically.
- **Suspense & skeletons**: every data section on public pages and dashboards is an async Server Component wrapped in `<Suspense>` with a matching skeleton (`src/components/ui/Skeleton.tsx`); route-level `loading.tsx` files cover full-page loads.
- **Uploads**: files are served by `src/app/uploads/[...path]/route.ts` because Next.js does not serve files added to `/public` after a build. Images are converted to WebP (max 2000 px) with `sharp`.
- **Maps** use Leaflet + OpenStreetMap (no API key). Swap the tile URL in `src/components/site/map/*` for Mapbox/Google tiles if you prefer.
- **Visitor location**: browser geolocation → nearest city in your directory; the visitor can also pick a city or ZIP. For IP-based location in analytics, host behind Vercel or Cloudflare (their geo headers are read automatically).
- **Payments**: Stripe Checkout and PayPal Checkout are redirect flows (no card data touches your server). The return URLs verify/capture the payment before marking the order paid. For extra safety in production you can also add a Stripe webhook.

### Design & animation
- Sections fade up as they scroll into view using **CSS scroll-driven animations** (no JavaScript, so content stays visible to search engines and older browsers simply show it without animation).
- Cards lift with soft shadows on hover, buttons use a subtle green gradient with a glow, modals/menus animate in, and the hero has slowly moving gradient blobs.
- Everything respects the visitor's **“reduce motion”** system setting. Colours, shadows and animations are defined once in `src/app/globals.css`.

### Notes & limitations
- **“Save” to browser bookmarks**: browsers do not allow websites to create bookmarks. The Save button stores the provider in the visitor's **Saved providers** list (`/saved`) and shows the Ctrl/⌘ + D shortcut to bookmark the page.
- Demo provider photos load from `randomuser.me` and seed artwork is simple SVG illustrations — replace them with real photos through the admin media library.
- Emails need SMTP settings; until then they are logged to the console.
- Visitor analytics ignore bots/crawlers (including headless browsers).
