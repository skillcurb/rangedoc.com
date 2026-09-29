/**
 * Database seed – fills a fresh database with demo content so every page
 * works right away. Run with:  npm run db:seed
 *
 * Creates: admin + demo provider login, plans, conditions, specialties,
 * insurances, cities, ~40 providers (paid / free / unclaimed), reviews,
 * FAQs, blog, products, CMS pages, SEO rows and home/claim content.
 *
 * Safe to re-run: it clears the demo tables first (NOT users you created,
 * except the demo provider account).
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type ProviderType, type Condition, type Specialty, type City, type Insurance } from "../src/generated/prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const slug = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Deterministic pseudo-random numbers so the seed is repeatable
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const pickMany = <T,>(arr: T[], n: number) => [...arr].sort(() => rand() - 0.5).slice(0, n);

const OFFICE_HOURS = {
  mon: { open: "08:00", close: "18:00", closed: false },
  tue: { open: "08:00", close: "18:00", closed: false },
  wed: { open: "08:00", close: "18:00", closed: false },
  thu: { open: "08:00", close: "18:00", closed: false },
  fri: { open: "08:00", close: "17:00", closed: false },
  sat: { open: "09:00", close: "13:00", closed: false },
  sun: { open: "", close: "", closed: true },
};

async function clear() {
  // Order matters because of foreign keys
  await prisma.analyticsEvent.deleteMany();
  await prisma.visitor.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.blogRating.deleteMany();
  await prisma.blogComment.deleteMany();
  await prisma.blogPost.deleteMany();
  await prisma.blogTag.deleteMany();
  await prisma.blogCategory.deleteMany();
  await prisma.planOrder.deleteMany();
  await prisma.review.deleteMany();
  await prisma.appointmentRequest.deleteMany();
  await prisma.providerMessage.deleteMany();
  await prisma.providerFaq.deleteMany();
  await prisma.providerVideo.deleteMany();
  await prisma.galleryImage.deleteMany();
  await prisma.providerLocation.deleteMany();
  await prisma.user.deleteMany({ where: { role: "PROVIDER" } });
  await prisma.provider.deleteMany();
  await prisma.popularSearch.deleteMany();
  await prisma.condition.deleteMany();
  await prisma.specialty.deleteMany();
  await prisma.insurance.deleteMany();
  await prisma.city.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.contentBlock.deleteMany();
  await prisma.testimonial.deleteMany();
  await prisma.cmsPage.deleteMany();
  await prisma.pageSeo.deleteMany();

  // PostgreSQL keeps counting IDs after rows are deleted – restart the counters
  // of the emptied tables so a fresh seed starts at id 1 again.
  const tables = [
    "AnalyticsEvent", "OrderItem", "Order", "Product", "ProductCategory", "BlogRating", "BlogComment", "BlogPost", "BlogTag", "BlogCategory",
    "PlanOrder", "Review", "AppointmentRequest", "ProviderMessage", "ProviderFaq", "ProviderVideo", "GalleryImage", "ProviderLocation", "Provider",
    "PopularSearch", "Condition", "Specialty", "Insurance", "City", "Plan", "ContentBlock", "Testimonial", "CmsPage", "PageSeo",
  ];
  for (const t of tables) {
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"${t}"', 'id'), COALESCE((SELECT MAX(id) FROM "${t}"), 0) + 1, false)`);
  }
}

async function main() {
  console.log("Seeding…");
  await clear();

  // ───────────── Admin ─────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@rangedoc.com";
  const adminPass = process.env.SEED_ADMIN_PASSWORD || "Admin@12345";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { name: "Site Admin", email: adminEmail, passwordHash: await bcrypt.hash(adminPass, 12), role: "ADMIN" },
  });

  // ───────────── Plans ─────────────
  const free = await prisma.plan.create({
    data: {
      name: "Free Claimed Profile", slug: "free", tagline: "Get started and take control of your profile.", priceCents: 0, interval: "LIFETIME",
      isFree: true, priceNote: "Always free", ctaLabel: "Claim Your Profile (Free)", sortOrder: 1,
      features: ["Claim and verify your profile", "Edit your basic information", "Add your specialties and services", "Show accepted insurance plans", "Add photos (up to 5)", "Show if you're accepting new patients"],
      maxPhotos: 5, maxLocations: 1, maxFaqs: 3, allowReviews: false, allowShareSave: false, allowRatingDisplay: false, allowVideo: false, allowAnalytics: false, allowAllFaqs: false, searchPriority: 0,
    },
  });
  const pro = await prisma.plan.create({
    data: {
      name: "Pro Profile", slug: "pro", tagline: "More tools. More visibility. More patients.", priceCents: 2999, interval: "MONTH",
      isPopular: true, badge: "MOST POPULAR", priceNote: "Cancel anytime", ctaLabel: "Upgrade to Pro", sortOrder: 2,
      features: ["Everything in Free, plus:", "Intro video + video gallery (6 videos)", "Social links: Facebook, X, LinkedIn, Pinterest, YouTube", "Unlimited photos", "Multiple practice locations", "Patient reviews & star rating", "View call and email click analytics", "Priority placement in search results", "Save & share buttons on your profile"],
      maxPhotos: 100, maxLocations: 10, maxFaqs: 50, allowReviews: true, allowShareSave: true, allowRatingDisplay: true, allowVideo: true, maxVideos: 6, allowSocialLinks: true, allowAnalytics: true, allowAllFaqs: true, searchPriority: 10,
    },
  });
  const featuredPlan = await prisma.plan.create({
    data: {
      name: "Featured Profile", slug: "featured", tagline: "Top placement and a featured badge.", priceCents: 7900, interval: "MONTH",
      badge: "BEST VISIBILITY", priceNote: "Cancel anytime", ctaLabel: "Go Featured", sortOrder: 3, active: true,
      features: ["Everything in Pro, plus:", "Featured provider badge", "Top of search results", "Home page placement eligibility", "Priority support"],
      maxPhotos: 200, maxLocations: 25, maxFaqs: 100, allowReviews: true, allowShareSave: true, allowRatingDisplay: true, allowVideo: true, maxVideos: 20, allowSocialLinks: true, allowAnalytics: true, allowAllFaqs: true, featuredBadge: true, searchPriority: 50,
    },
  });

  // ───────────── Conditions ─────────────
  const conditionData = [
    ["Back & Spine", "back-spine", "Back Pain", "lower back pain, back pain, spine, herniated disc, bulging disc, lumbar"],
    ["Neck", "neck", "Neck Pain", "neck pain, stiff neck, whiplash, cervical"],
    ["Shoulder", "shoulder", "Shoulder Pain", "shoulder pain, rotator cuff, frozen shoulder"],
    ["Hip", "hip", "Hip Pain", "hip pain, bursitis, hip replacement"],
    ["Knee", "knee", "Knee Pain", "knee pain, acl, meniscus, runner's knee, patella"],
    ["Foot & Ankle", "foot-ankle", "Foot & Ankle Pain", "ankle sprain, plantar fasciitis, foot pain, heel pain"],
    ["Sports Injury", "sports-injury", "Sports Injuries", "sports injury, sprain, strain, tendonitis, athlete"],
    ["Headaches", "headaches", "Headaches", "headache, migraine, tension headache"],
    ["Sciatica", "sciatica", "Sciatica", "sciatica, nerve pain, leg pain, pinched nerve"],
    ["Pelvic Floor", "pelvic-floor", "Pelvic Floor", "pelvic pain, incontinence, postpartum, prenatal"],
    ["Post-Surgery", "post-surgery", "Post-Surgical Rehabilitation", "post surgery, rehab, joint replacement, recovery"],
    ["Wrist & Hand", "wrist-hand", "Wrist & Hand Pain", "carpal tunnel, wrist pain, hand pain, tennis elbow"],
    ["Not Sure", "not-sure", "Not Sure", "general pain, chronic pain, not sure"],
  ] as const;
  const conditions: Condition[] = [];
  for (const [i, [short, s, name, keywords]] of conditionData.entries()) {
    conditions.push(
      await prisma.condition.create({
        data: {
          name, slug: s === "back-spine" ? "back-pain" : s === "neck" ? "neck-pain" : s === "shoulder" ? "shoulder-pain" : s === "hip" ? "hip-pain" : s === "knee" ? "knee-pain" : s, shortName: short,
          image: `/seed/cond-${s}.svg`, keywords, sortOrder: i, showOnHome: true,
          description: `Find licensed physical therapists and chiropractors who specialize in ${name.toLowerCase()}. Compare ratings, insurance and availability, then request an appointment online.`,
        },
      }),
    );
  }
  const C = (s: string) => conditions.find((c) => c.slug === s)!;

  // ───────────── Specialties & insurances ─────────────
  const specialtyNames = ["Manual Therapy", "Sports Physical Therapy", "Spinal Adjustments", "Dry Needling", "Pelvic Floor Therapy", "Vestibular Therapy", "Post-Surgery Rehab", "Orthopedic Rehab", "Women's Health", "Pediatric Therapy", "Movement & Exercise Therapy", "Postural Correction", "Chiropractic Care", "Injury Rehab"];
  const specialties: Specialty[] = [];
  for (const [i, name] of specialtyNames.entries()) specialties.push(await prisma.specialty.create({ data: { name, slug: slug(name), sortOrder: i } }));
  const S = (name: string) => specialties.find((s) => s.name === name)!;

  const insuranceNames = ["Blue Cross Blue Shield", "Aetna", "UnitedHealthcare", "Cigna", "Medicare", "Humana", "Medicaid", "Tricare", "Kaiser Permanente", "Self-Pay / Out-of-Network"];
  const insurances: Insurance[] = [];
  for (const [i, name] of insuranceNames.entries()) insurances.push(await prisma.insurance.create({ data: { name, slug: slug(name), sortOrder: i } }));

  // ───────────── Cities ─────────────
  const cityData: [string, string, string, number, number, string, boolean][] = [
    ["New York", "New York", "NY", 40.7128, -74.006, "10001,10002,10003,10010,10011,10016,10019,10022,10028,10036", true],
    ["Los Angeles", "California", "CA", 34.0522, -118.2437, "90001,90012,90015,90024,90028,90036,90048,90064", true],
    ["Chicago", "Illinois", "IL", 41.8781, -87.6298, "60601,60602,60605,60607,60610,60611,60614,60657", true],
    ["Houston", "Texas", "TX", 29.7604, -95.3698, "77002,77003,77004,77006,77007,77019,77024,77056", true],
    ["Phoenix", "Arizona", "AZ", 33.4484, -112.074, "85003,85004,85006,85008,85012,85014,85016,85018", true],
    ["Austin", "Texas", "TX", 30.2672, -97.7431, "78701,78702,78703,78704,78705,78731,78746,78757", false],
    ["Denver", "Colorado", "CO", 39.7392, -104.9903, "80202,80203,80205,80206,80209,80210,80218", false],
    ["Seattle", "Washington", "WA", 47.6062, -122.3321, "98101,98102,98103,98104,98105,98109,98115,98122", false],
    ["Dallas", "Texas", "TX", 32.7767, -96.797, "75201,75202,75204,75205,75206,75219,75225", false],
    ["Miami", "Florida", "FL", 25.7617, -80.1918, "33125,33127,33128,33129,33130,33131,33132,33137", false],
    ["Boston", "Massachusetts", "MA", 42.3601, -71.0589, "02108,02109,02110,02111,02114,02115,02116", false],
    ["Portland", "Oregon", "OR", 45.5152, -122.6784, "97201,97204,97205,97209,97210,97214,97232", false],
    ["San Diego", "California", "CA", 32.7157, -117.1611, "92101,92102,92103,92104,92108,92109,92116", false],
    ["San Antonio", "Texas", "TX", 29.4241, -98.4936, "78201,78202,78204,78205,78209,78212,78215", false],
  ];
  const cities: City[] = [];
  for (const [i, [name, state, code, lat, lng, zips, featured]] of cityData.entries()) {
    cities.push(
      await prisma.city.create({
        data: {
          name, state, stateCode: code, slug: slug(`${name}-${code}`), lat, lng, zipCodes: zips, featured, sortOrder: i,
          image: `/seed/city-${slug(name)}.svg`,
          description: `Find top-rated physical therapists and chiropractors in ${name}, ${code}. Compare providers, insurance and availability.`,
        },
      }),
    );
  }
  const city = (name: string) => cities.find((c) => c.name === name)!;

  // ───────────── Providers ─────────────
  const women = ["Sarah Kim", "Jennifer Patel", "Emily Carter", "Lisa Nguyen", "Maria Gonzalez", "Rachel Adams", "Olivia Brooks", "Hannah Lee", "Priya Shah", "Grace Thompson", "Megan Rivera", "Chloe Wilson", "Ava Martinez", "Nora Bennett", "Sofia Ramirez", "Isabella Chen", "Laura Mitchell", "Zoe Parker"];
  const men = ["Michael Torres", "Daniel Park", "James Wilson", "David Nguyen", "Ryan Cooper", "Kevin Brown", "Marcus Hill", "Ethan Walker", "Lucas Scott", "Noah Reed", "Aaron Davis", "Tyler Morgan", "Brian Foster", "Chris Young", "Jason Bell", "Adam Hughes", "Samuel King", "Owen Price", "Victor Lopez", "Eric Sanders", "Nathan Gray", "Patrick Ward"];
  const schools = ["University of Texas Health Science Center", "Palmer College of Chiropractic", "University of Southern California", "Northwestern University", "Duke University", "Parker University", "Life University", "Emory University", "Texas State University", "University of Colorado"];

  // Austin gets many providers so the demo search looks full
  const plan: { city: string; count: number }[] = [
    { city: "Austin", count: 14 }, { city: "New York", count: 4 }, { city: "Los Angeles", count: 3 }, { city: "Chicago", count: 3 },
    { city: "Houston", count: 3 }, { city: "Phoenix", count: 2 }, { city: "Denver", count: 3 }, { city: "Seattle", count: 3 },
    { city: "Dallas", count: 2 }, { city: "Miami", count: 1 }, { city: "Boston", count: 1 }, { city: "Portland", count: 1 },
  ];

  let n = 0;
  let wi = 0;
  let mi = 0;
  const clinicWords = ["Motion", "Peak", "Align", "Core", "Summit", "Balance", "Restore", "Evolve", "Thrive", "Stride"];
  const createdProviders: { id: number; slug: string; tier: string }[] = [];

  for (const { city: cityName, count } of plan) {
    const c = city(cityName);
    for (let k = 0; k < count; k++, n++) {
      const female = n % 2 === 0;
      const full = female ? women[wi++ % women.length] : men[mi++ % men.length];
      const [firstName, lastName] = full.split(" ");
      const type: ProviderType = n % 3 === 1 ? "CHIROPRACTOR" : "PHYSICAL_THERAPIST";
      // Tier mix: ~35% pro, ~10% featured, ~25% free claimed, ~30% unclaimed
      const r = n % 10;
      const tier = r < 1 ? "featured" : r < 4 ? "pro" : r < 6 ? "free" : "unclaimed";
      const claimed = tier !== "unclaimed";
      const credentials = type === "CHIROPRACTOR" ? "DC" : pick(["PT, DPT", "DPT", "PT, DPT, OCS", "DPT, SCS"]);
      const s = slug(`dr-${firstName}-${lastName}-${cityName}`);
      const provConds = type === "CHIROPRACTOR" ? [C("back-pain"), C("neck-pain"), C("headaches"), C("sciatica"), ...pickMany(conditions.slice(0, 12), 2)] : [C("back-pain"), ...pickMany(conditions.slice(1, 12), 5)];
      const provSpecs = type === "CHIROPRACTOR" ? [S("Spinal Adjustments"), S("Chiropractic Care"), ...pickMany(specialties, 2)] : [S("Manual Therapy"), ...pickMany(specialties.filter((x) => !["Spinal Adjustments", "Chiropractic Care"].includes(x.name)), 4)];
      const provIns = pickMany(insurances, 4 + Math.floor(rand() * 4));
      const photoIndex = (n * 7) % 90;
      const practice = `${pick(clinicWords)}${type === "CHIROPRACTOR" ? " Chiropractic" : " Physical Therapy"}`;

      const isSarah = full === "Sarah Kim" && cityName === "Austin";
      const provider = await prisma.provider.create({
        data: {
          slug: s, prefix: "Dr.", firstName, lastName, credentials, providerType: type,
          headline: type === "CHIROPRACTOR" ? "Chiropractor" : "Physical Therapist",
          practiceName: `${practice} ${cityName}`,
          bio: `${firstName} ${lastName} is a licensed ${type === "CHIROPRACTOR" ? "chiropractor" : "physical therapist"} in ${cityName}, ${c.stateCode}, with over ${5 + (n % 12)} years of experience helping patients recover from pain and return to the activities they love. ${female ? "She" : "He"} takes a personalized, movement-focused approach, combining evidence-based care with a supportive, goal-oriented environment.\n\n${firstName} works with everyone from weekend warriors to people dealing with chronic pain, and is passionate about helping patients move better and live healthier, more active lives.`,
          quote: "My goal is to help you move without pain and get back to the activities you love.",
          bestMatch: claimed ? `${firstName} is an excellent match for ${provConds[0].name.toLowerCase()} and ${provConds[1].name.toLowerCase()}. ${female ? "She" : "He"} specializes in movement-based rehabilitation, helping active adults recover, get stronger, and prevent future injury.` : null,
          bestMatchPoints: claimed ? `Specializes in ${provConds[0].name.toLowerCase()} recovery\nExperienced with sports injuries\nMovement-focused, active approach` : null,
          photo: `https://randomuser.me/api/portraits/${female ? "women" : "men"}/${photoIndex}.jpg`,
          gender: female ? "Female" : "Male",
          languages: n % 4 === 0 ? "English, Spanish" : "English",
          education: pick(schools),
          yearsExperience: 5 + (n % 12),
          licenseNumber: `${c.stateCode}-${100000 + n * 37}`,
          licenseState: c.stateCode,
          licenseVerified: claimed || n % 3 === 0,
          claimStatus: claimed ? "CLAIMED" : "UNCLAIMED",
          claimedAt: claimed ? new Date() : null,
          phone: `(${500 + (n % 400)}) 555-${String(1000 + n * 13).slice(-4)}`,
          email: claimed ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com` : null,
          website: `https://www.${slug(practice).replace(/-/g, "")}.example.com`,
          // Demo social links for paid profiles (replace with real ones in the dashboard)
          ...(tier === "pro" || tier === "featured" || isSarah
            ? {
                facebookUrl: `https://facebook.com/${slug(practice).replace(/-/g, "")}`,
                xUrl: `https://x.com/${slug(practice).replace(/-/g, "")}`,
                linkedinUrl: `https://linkedin.com/company/${slug(practice)}`,
                pinterestUrl: `https://pinterest.com/${slug(practice).replace(/-/g, "")}`,
                youtubeUrl: `https://youtube.com/@${slug(practice).replace(/-/g, "")}`,
              }
            : {}),
          acceptingNewPatients: n % 5 !== 4,
          telehealth: n % 3 === 0,
          responseTime: claimed ? "Typically responds within 1 business day" : null,
          officeHours: OFFICE_HOURS,
          displayRating: tier === "pro" || tier === "featured" ? Number((4.5 + rand() * 0.5).toFixed(1)) : null,
          displayReviewCount: tier === "pro" || tier === "featured" ? 40 + Math.floor(rand() * 120) : null,
          ratingSource: tier === "pro" || tier === "featured" ? "Google" : null,
          endorsement: tier === "pro" || tier === "featured" ? `Recommended by ${8 + (n % 10)}+ referring physicians in the ${cityName} area.` : null,
          featured: isSarah || (claimed && ["Michael Torres", "Jennifer Patel"].includes(full)),
          featuredOrder: isSarah ? 0 : n,
          planId: tier === "featured" ? featuredPlan.id : tier === "pro" || isSarah ? pro.id : tier === "free" ? free.id : null,
          planExpiresAt: tier === "featured" || tier === "pro" || isSarah ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) : null,
          cityId: c.id,
          conditions: { connect: provConds.map((x) => ({ id: x.id })) },
          specialties: { connect: provSpecs.map((x) => ({ id: x.id })) },
          insurances: { connect: provIns.map((x) => ({ id: x.id })) },
        },
      });
      createdProviders.push({ id: provider.id, slug: provider.slug, tier: isSarah ? "pro" : tier });

      // Locations – spread around the city centre (paid plans get a second clinic)
      const locCount = tier === "pro" || tier === "featured" || isSarah ? 2 : 1;
      for (let l = 0; l < locCount; l++) {
        const zip = c.zipCodes!.split(",")[(n + l) % 7];
        await prisma.providerLocation.create({
          data: {
            providerId: provider.id, name: l === 0 ? `${practice} ${cityName}` : `${practice} ${pick(["Westlake", "North", "Downtown", "East Side", "South"])}`,
            address: `${1000 + ((n * 97 + l * 311) % 8000)} ${pick(["Wellness Drive", "Main Street", "Congress Ave", "Oak Lane", "Park Blvd", "Lakeview Rd"])}`,
            cityId: c.id, cityName, state: c.stateCode, zip,
            lat: c.lat + (rand() - 0.5) * 0.16, lng: c.lng + (rand() - 0.5) * 0.18,
            phone: null, isPrimary: l === 0, sortOrder: l,
          },
        });
      }

      // Gallery photos
      const photoCount = tier === "unclaimed" ? 2 : tier === "free" ? 4 : 6;
      for (let g = 0; g < photoCount; g++) {
        await prisma.galleryImage.create({ data: { providerId: provider.id, url: `/seed/clinic-${((n + g) % 6) + 1}.svg`, alt: `${practice} clinic photo ${g + 1}`, sortOrder: g } });
      }

      // FAQs
      const faqs = [
        [`Do I need a referral to see ${firstName}?`, "In most states you can see a physical therapist or chiropractor without a referral (direct access). Some insurance plans still require one, so check your policy or call the office."],
        ["What should I bring to my first appointment?", "Please bring a photo ID, your insurance card, a list of medications, any imaging reports, and wear comfortable clothing that lets us assess the painful area."],
        ["How many sessions will I need?", "It depends on your condition and goals. Many patients feel better in 4–8 visits; we'll build a plan together at your first appointment."],
        ["Do you offer telehealth visits?", "Yes, virtual visits are available for follow-ups, exercise coaching and ergonomic assessments."],
        ["What insurance do you accept?", `We accept ${provIns.slice(0, 3).map((i) => i.name).join(", ")} and more. Self-pay options are also available.`],
      ];
      for (const [fi, [question, answer]] of faqs.entries()) {
        if (tier === "unclaimed" && fi > 2) break;
        await prisma.providerFaq.create({ data: { providerId: provider.id, question, answer, sortOrder: fi } });
      }

      // Reviews for paid providers
      if (tier === "pro" || tier === "featured" || isSarah) {
        const reviews = [
          [5, "Life changing", `${firstName} is knowledgeable, compassionate, and truly invested in patients' success. I highly recommend!`],
          [5, "Back to running", "After three months of knee pain I'm back to running pain-free. The exercises were easy to follow."],
          [4, "Great experience", "Friendly staff, on time, and a clear treatment plan. Parking can be tricky."],
        ] as const;
        for (const [rating, title, body] of reviews) {
          await prisma.review.create({ data: { providerId: provider.id, rating, title, body, authorName: pick(["Jamie S.", "Marcus C.", "Emily R.", "Daniel B.", "Sophia L.", "Chris P."]), status: "APPROVED" } });
        }
      }
    }
  }

  // Demo provider login (Sarah Kim, Pro plan)
  const sarah = await prisma.provider.findFirst({ where: { firstName: "Sarah", lastName: "Kim" } });
  if (sarah) {
    await prisma.user.create({
      data: { name: "Dr. Sarah Kim", email: "provider@rangedoc.com", passwordHash: await bcrypt.hash("Provider@123", 12), role: "PROVIDER", providerId: sarah.id },
    });
    // Some leads for her dashboard
    const people = [["Jamie", "Smith"], ["Marcus", "Chen"], ["Emily", "Rodriguez"], ["Daniel", "Brooks"], ["Sophia", "Lee"]];
    for (const [i, [firstName, lastName]] of people.entries()) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + i + 1);
      d.setUTCHours(0, 0, 0, 0);
      await prisma.appointmentRequest.create({
        data: { providerId: sarah.id, date: d, timeSlot: ["09:00", "10:30", "13:00", "15:30", "11:00"][i], firstName, lastName, email: `${firstName.toLowerCase()}@example.com`, phone: "(512) 555-0199", reason: ["Lower back pain for 3 weeks", "Sports injury rehabilitation", "Knee pain treatment options", "Dry needling questions", "Post-surgical rehab"][i], insurance: "Aetna", status: i < 2 ? "NEW" : "CONFIRMED" },
      });
      await prisma.providerMessage.create({
        data: { providerId: sarah.id, name: `${firstName} ${lastName}`, contact: `${firstName.toLowerCase()}@example.com`, subject: ["Question about back pain", "Do you take BCBS?", "Availability next week", "Dry needling", "Post-surgery rehab"][i], message: "Hi, I found you on RangeDoc and wanted to ask a quick question about treatment options and availability. Thanks!", read: i > 1 },
      });
    }
  }

  // ───────────── Analytics demo data (last 30 days) ─────────────
  const devices = ["Desktop", "Mobile", "Mobile", "Tablet"];
  const browsers = ["Chrome", "Safari", "Firefox", "Edge"];
  const visitorCities = ["Austin", "Houston", "Dallas", "New York", "Denver", "Seattle", "Chicago"];
  const events: { type: "PAGE_VIEW" | "PROFILE_VIEW" | "SEARCH_IMPRESSION" | "SEARCH_CLICK" | "CALL_CLICK" | "EMAIL_CLICK" | "WEBSITE_CLICK" | "APPOINTMENT_CLICK" | "GALLERY_VIEW" | "SEARCH"; providerId: number | null; path: string; device: string; browser: string; city: string; country: string; visitorId: string; createdAt: Date; meta?: object }[] = [];
  const visitorIds: string[] = [];
  for (let v = 0; v < 120; v++) {
    const id = `demo-visitor-${v}`;
    visitorIds.push(id);
    await prisma.visitor.create({ data: { id, device: pick(devices), browser: pick(browsers), os: pick(["Windows", "macOS", "iOS", "Android"]), city: pick(visitorCities), country: "US", visitCount: 1 + Math.floor(rand() * 5), pageViews: 3 + Math.floor(rand() * 20), firstSeenAt: new Date(Date.now() - rand() * 30 * 864e5) } });
  }
  for (let day = 0; day < 30; day++) {
    const base = 20 + Math.floor(rand() * 25) + (day > 15 ? 10 : 0);
    for (let e = 0; e < base; e++) {
      const created = new Date(Date.now() - (29 - day) * 864e5 - rand() * 864e5 * 0.9);
      const prov = pick(createdProviders.filter((p) => p.tier !== "unclaimed"));
      const common = { device: pick(devices), browser: pick(browsers), city: pick(visitorCities), country: "US", visitorId: pick(visitorIds), createdAt: created };
      events.push({ ...common, type: "PAGE_VIEW", providerId: null, path: pick(["/", "/search", "/providers", "/blog", "/products", `/provider/${prov.slug}`]) });
      events.push({ ...common, type: "PROFILE_VIEW", providerId: prov.id, path: `/provider/${prov.slug}` });
      events.push({ ...common, type: "SEARCH_IMPRESSION", providerId: prov.id, path: "/search", meta: { condition: pick(["back-pain", "neck-pain", "knee-pain", "shoulder-pain", "sports-injury"]) } });
      if (rand() < 0.4) events.push({ ...common, type: "SEARCH_CLICK", providerId: prov.id, path: "/search" });
      if (rand() < 0.25) events.push({ ...common, type: "WEBSITE_CLICK", providerId: prov.id, path: `/provider/${prov.slug}` });
      if (rand() < 0.12) events.push({ ...common, type: "CALL_CLICK", providerId: prov.id, path: `/provider/${prov.slug}` });
      if (rand() < 0.08) events.push({ ...common, type: "EMAIL_CLICK", providerId: prov.id, path: `/provider/${prov.slug}` });
      if (rand() < 0.1) events.push({ ...common, type: "APPOINTMENT_CLICK", providerId: prov.id, path: `/provider/${prov.slug}` });
      if (rand() < 0.15) events.push({ ...common, type: "GALLERY_VIEW", providerId: prov.id, path: `/provider/${prov.slug}` });
    }
  }
  // Extra activity for the demo provider so her dashboard charts look alive
  if (sarah) {
    for (let day = 0; day < 30; day++) {
      const views = 25 + Math.round(15 * Math.sin(day / 3)) + Math.floor(rand() * 10) + day;
      for (let e = 0; e < views; e++) {
        const created = new Date(Date.now() - (29 - day) * 864e5 - rand() * 864e5 * 0.9);
        const common = { device: pick(devices), browser: pick(browsers), city: pick(visitorCities), country: "US", visitorId: pick(visitorIds), createdAt: created, providerId: sarah.id, path: `/provider/${sarah.slug}` };
        events.push({ ...common, type: "PROFILE_VIEW" });
        events.push({ ...common, type: "SEARCH_IMPRESSION", path: "/search", meta: { condition: pick(["back-pain", "back-pain", "neck-pain", "knee-pain", "shoulder-pain", "sports-injury"]) } });
        if (rand() < 0.3) events.push({ ...common, type: "WEBSITE_CLICK" });
        if (rand() < 0.1) events.push({ ...common, type: "CALL_CLICK" });
        if (rand() < 0.06) events.push({ ...common, type: "EMAIL_CLICK" });
        if (rand() < 0.08) events.push({ ...common, type: "APPOINTMENT_CLICK" });
      }
    }
  }
  for (let i = 0; i < events.length; i += 1000) await prisma.analyticsEvent.createMany({ data: events.slice(i, i + 1000) });

  // ───────────── Home content ─────────────
  await prisma.contentBlock.createMany({
    data: [
      { section: "home_hero_badges", icon: "ShieldCheck", title: "Licensed professionals", sortOrder: 1 },
      { section: "home_hero_badges", icon: "Users", title: "Real patient reviews", sortOrder: 2 },
      { section: "home_hero_badges", icon: "CalendarCheck", title: "Easy to connect", sortOrder: 3 },
      { section: "home_stats", icon: "Users", title: "10,000+", text: "PTs & Chiropractors Listed", sortOrder: 1 },
      { section: "home_stats", icon: "ShieldCheck", title: "License Verified", text: "Providers", sortOrder: 2 },
      { section: "home_stats", icon: "MapPin", title: "Local Care", text: "Near You", sortOrder: 3 },
      { section: "home_stats", icon: "BadgeCheck", title: "Major Insurances", text: "Accepted", sortOrder: 4 },
      { section: "claim_steps", icon: "Search", title: "Find your profile", text: "Search for your name and practice location.", sortOrder: 1 },
      { section: "claim_steps", icon: "ShieldCheck", title: "Verify ownership", text: "Securely confirm you're the provider.", sortOrder: 2 },
      { section: "claim_steps", icon: "CheckCircle2", title: "Complete your profile", text: "Add details, photos, insurance and more.", sortOrder: 3 },
      { section: "claim_why", icon: "Users", title: "Reach more patients", text: "Be visible to people actively seeking care in your area.", sortOrder: 1 },
      { section: "claim_why", icon: "Star", title: "Build credibility", text: "Showcase your experience, specialties and patient reviews.", sortOrder: 2 },
      { section: "claim_why", icon: "BarChart3", title: "Show what makes you unique", text: "Add photos, videos, services and accepted insurance plans.", sortOrder: 3 },
      { section: "claim_why", icon: "Heart", title: "Save time", text: "Answer common questions up front and attract better-fit patients.", sortOrder: 4 },
      { section: "claim_why", icon: "Leaf", title: "Be part of a healthier future", text: "Join a trusted network that's helping more people move and live better.", sortOrder: 5 },
      { section: "products_trust", icon: "ShieldCheck", title: "Expert curated", text: "Picked by PTs & Chiropractors", sortOrder: 1 },
      { section: "products_trust", icon: "Truck", title: "Trusted brands", text: "Top-rated, reputable products", sortOrder: 2 },
      { section: "products_trust", icon: "Heart", title: "Support your progress", text: "Move better. Live brighter.", sortOrder: 3 },
      { section: "products_howto", icon: "Lightbulb", title: "1. Identify your pain area", text: "Focus on the area that needs support most.", sortOrder: 1 },
      { section: "products_howto", icon: "Settings", title: "2. Choose the right type", text: "From braces to massage tools, find what fits your needs.", sortOrder: 2 },
      { section: "products_howto", icon: "CheckCircle2", title: "3. Look for trusted brands", text: "We feature proven, high-quality products.", sortOrder: 3 },
      { section: "products_howto", icon: "PersonStanding", title: "4. Pair with expert care", text: "Get the best results by combining tools with care from a PT or chiropractor.", sortOrder: 4 },
    ],
  });

  const popular = [
    ["Sports Physical Therapy", "PHYSICAL_THERAPIST", null, "Sports Physical Therapy"],
    ["Pelvic Floor Therapy", "PHYSICAL_THERAPIST", "pelvic-floor", null],
    ["Back Pain Care", null, "back-pain", null],
    ["Sciatica Care", null, "sciatica", null],
    ["Vestibular Therapy", "PHYSICAL_THERAPIST", null, "Vestibular Therapy"],
    ["Post-Surgery Rehab", "PHYSICAL_THERAPIST", "post-surgery", null],
    ["Chiropractic for Neck Pain", "CHIROPRACTOR", "neck-pain", null],
    ["Chiropractic for Back Pain", "CHIROPRACTOR", "back-pain", null],
  ] as const;
  for (const [i, [label, type, cond, spec]] of popular.entries()) {
    await prisma.popularSearch.create({ data: { label, providerType: type, conditionId: cond ? C(cond).id : null, specialtyId: spec ? S(spec).id : null, sortOrder: i } });
  }

  await prisma.testimonial.createMany({
    data: [
      { name: "Dr. Sarah Kim, DPT", role: "Physical Therapist", location: "Denver, CO", avatar: "https://randomuser.me/api/portraits/women/44.jpg", quote: "Claiming my profile was quick and easy. I've already had new patients reach out through RangeDoc!", rating: 5, sortOrder: 1 },
      { name: "Dr. Michael Torres, DC", role: "Chiropractor", location: "Austin, TX", avatar: "https://randomuser.me/api/portraits/men/32.jpg", quote: "The Pro profile is worth it. I can see how many people are calling and emailing, and it helps me stand out.", rating: 5, sortOrder: 2 },
      { name: "Dr. Emily Carter, DPT", role: "Physical Therapist", location: "Portland, OR", avatar: "https://randomuser.me/api/portraits/women/68.jpg", quote: "I love being able to showcase my approach with photos and a video. It helps patients get to know me.", rating: 5, sortOrder: 3 },
    ],
  });

  // ───────────── Blog ─────────────
  const cats = await Promise.all(
    ["Guides", "Back & Neck", "Exercise & Recovery", "Wellness"].map((name) => prisma.blogCategory.create({ data: { name, slug: slug(name), description: `Articles about ${name.toLowerCase()} from licensed providers.` } })),
  );
  const tags = await Promise.all(["back pain", "chiropractic", "physical therapy", "exercise", "posture", "sleep", "knee"].map((name) => prisma.blogTag.create({ data: { name, slug: slug(name) } })));
  const T = (name: string) => tags.find((t) => t.name === name)!;
  const para = (topic: string) =>
    `<p>${topic} is one of the most common reasons people look for professional care. The good news: with the right guidance, most people improve significantly within a few weeks.</p>
<h2>What causes it?</h2><p>Pain usually comes from a combination of load, movement habits, previous injuries and stress. A licensed provider will look at the whole picture rather than a single structure.</p>
<ul><li>Sudden increase in activity</li><li>Long hours sitting or standing</li><li>Previous injury that never fully healed</li></ul>
<h2>How a professional can help</h2><p>Physical therapists focus on movement, strength and education, while chiropractors often use spinal adjustments and manual therapy. Many patients benefit from both.</p>
<blockquote>Motion is lotion — gentle, regular movement is usually better than complete rest.</blockquote>
<h2>When to seek care</h2><p>If pain lasts more than a week, wakes you up at night, or comes with numbness or weakness, book an evaluation with a licensed provider.</p>`;
  const posts = [
    ["PT vs Chiropractor: What's the Difference?", "pt-vs-chiro", 0, ["physical therapy", "chiropractic"], true],
    ["Physical Therapy for Back Pain", "back-pain-pt", 1, ["back pain", "physical therapy"], true],
    ["When Should You See a Chiropractor?", "see-chiropractor", 0, ["chiropractic"], true],
    ["5 Knee Exercises You Can Do at Home", "knee-exercises", 2, ["knee", "exercise"], false],
    ["Fixing Your Desk Posture in 10 Minutes a Day", "posture-desk", 3, ["posture"], false],
    ["The Best Sleeping Positions for Neck Pain", "sleep-neck", 1, ["sleep", "posture"], false],
  ] as const;
  for (const [i, [title, img, catIdx, tagNames, featured]] of posts.entries()) {
    await prisma.blogPost.create({
      data: {
        title, slug: slug(title), excerpt: `Everything you need to know about ${title.toLowerCase()} — explained by licensed providers.`,
        content: para(title), coverImage: `/seed/blog-${img}.svg`, coverAlt: title, authorName: "RangeDoc Editorial Team",
        categoryId: cats[catIdx].id, tags: { connect: tagNames.map((t) => ({ id: T(t).id })) }, published: true,
        publishedAt: new Date(Date.now() - i * 5 * 864e5), featured, readingMinutes: 4 + i, ratingSum: 23 + i, ratingCount: 5,
      },
    });
  }

  // ───────────── Products ─────────────
  const pcats = await Promise.all(
    [["Back & Spine", "Bone"], ["Neck", "PersonStanding"], ["Shoulder", "Dumbbell"], ["Knee", "Footprints"], ["Hip", "Accessibility"], ["Sports Recovery", "Bike"], ["General Recovery", "Leaf"]].map(([name, icon], i) =>
      prisma.productCategory.create({ data: { name, slug: slug(name), icon, sortOrder: i, description: `Recovery tools for ${name.toLowerCase()}.` } }),
    ),
  );
  const PC = (name: string) => pcats.find((c) => c.name === name)!;
  const products: [string, string, string, number, number | null, string, string, string, string][] = [
    ["Bauerfeind LumboTrain Back Brace", "back-brace", "Back & Spine", 11900, 14900, "Braces & Support", "Bauerfeind", "Targeted support for lower back pain and everyday movement.", "Pain Relief,Posture Support"],
    ["AUVON Dual Channel TENS Unit", "tens-unit", "General Recovery", 3600, 5000, "TENS & Recovery Tech", "AUVON", "Drug-free pain relief for sore muscles and chronic pain.", "Pain Relief,Recovery"],
    ["Therabody RecoveryTherm Hot & Cold Wrap", "hot-cold-wrap", "General Recovery", 4900, 6900, "Hot / Cold Therapy", "Therabody", "Soothing relief for pain, swelling and recovery.", "Pain Relief,Recovery"],
    ["TriggerPoint GRID Foam Roller", "foam-roller", "Sports Recovery", 3400, 4200, "Foam Rollers", "TriggerPoint", "Relieve muscle tension and improve mobility.", "Recovery,Mobility & Flexibility"],
    ["Sparthos Shoulder Compression Brace", "shoulder-brace", "Shoulder", 3900, 5500, "Braces & Support", "Sparthos", "Support, stability and comfort for shoulder pain.", "Injury Prevention,Pain Relief"],
    ["Bauerfeind GenuTrain Knee Support", "knee-support", "Knee", 8900, 12900, "Braces & Support", "Bauerfeind", "Medical-grade support for an active lifestyle.", "Injury Prevention,Pain Relief"],
    ["TheraBand Resistance Band Set", "resistance-bands", "Sports Recovery", 1900, 3200, "Resistance Bands", "TheraBand", "Build strength, improve mobility and prevent injury.", "Injury Prevention,Mobility & Flexibility"],
    ["Cervical Neck Pillow", "neck-pillow", "Neck", 4900, 7900, "Sleep & Comfort", "RestWell", "Ergonomic support for better sleep and less neck pain.", "Everyday Wellness,Pain Relief"],
    ["Intelliskin Posture Corrector", "posture-corrector", "Back & Spine", 3400, 4900, "Posture Support", "Intelliskin", "Build better posture for less pain and more confidence.", "Posture Support"],
    ["Theragun Relief Massage Gun", "massage-gun", "Sports Recovery", 19900, 22900, "Massage Tools", "Therabody", "Percussive therapy for faster recovery and less soreness.", "Recovery,Pain Relief"],
    ["Chirp Yoga Wheel", "yoga-wheel", "Back & Spine", 3900, 5900, "Mobility & Stretching", "Chirp", "Improve flexibility, relieve back tension and open your spine.", "Mobility & Flexibility"],
    ["CEP Compression Sleeve", "compression-sleeve", "Sports Recovery", 5400, 6900, "Braces & Support", "CEP", "Boost circulation and recover faster.", "Recovery,Everyday Wellness"],
  ];
  for (const [i, [name, img, cat, price, compare, type, brand, short, uses]] of products.entries()) {
    await prisma.product.create({
      data: {
        name, slug: slug(name), shortDescription: short, priceCents: price, compareAtCents: compare, image: `/seed/product-${img}.svg`,
        images: [`/seed/product-${img}.svg`], productType: type, brand, useCases: uses, categoryId: PC(cat).id, stock: 50, sku: `RD-${1000 + i}`,
        featured: i < 4, sortOrder: i,
        description: `<p>${short}</p><h3>Why providers recommend it</h3><ul><li>Designed for everyday comfort</li><li>Durable, easy to clean materials</li><li>Pairs well with a home exercise program</li></ul><p>These products support general wellness and are not a substitute for professional medical advice.</p>`,
      },
    });
  }

  // ───────────── CMS pages ─────────────
  const cms: [string, string, string | null][] = [
    ["About Us", "about-us", "company"],
    ["How It Works", "how-it-works", "company"],
    ["Privacy Policy", "privacy-policy", "company"],
    ["Terms of Use", "terms-of-use", "company"],
    ["Cookie Policy", "cookie-policy", "company"],
    ["Help Center", "help-center", "providers"],
    ["Provider Resources", "provider-resources", "providers"],
  ];
  for (const [i, [title, s, group]] of cms.entries()) {
    await prisma.cmsPage.create({
      data: {
        title, slug: s, footerGroup: group, sortOrder: i, excerpt: `${title} – RangeDoc`,
        content: `<p>This is the <b>${title}</b> page. Edit this content any time from <em>Admin → Pages</em>.</p><h2>Our mission</h2><p>We help people find licensed physical therapists and chiropractors near them, and help providers grow their practices.</p>`,
      },
    });
  }

  // ───────────── SEO rows ─────────────
  const seoPages = [
    ["home", "Home page", "RangeDoc – Find Physical Therapists & Chiropractors Near You", "Discover licensed physical therapists and chiropractors near you. Compare ratings, insurance and availability."],
    ["search", "Search results", null, null], ["providers", "All providers", "All Providers", null], ["claim", "Claim your profile", "Claim Your Profile – For Physical Therapists & Chiropractors", "Claim your free profile to reach more patients and grow your practice."],
    ["products", "Recovery marketplace", "Recovery Marketplace – Curated Recovery Tools", "Shop braces, massage tools and recovery products curated by physical therapists and chiropractors."],
    ["blog", "Blog / resources", "Helpful Resources", "Guides and articles from licensed physical therapists and chiropractors."],
    ["conditions", "Browse by condition", "Browse by Condition", null], ["locations", "Browse by location", "Browse by Location", null], ["contact", "Contact us", "Contact Us", null],
    ["login", "Provider login", "Provider Login", null], ["register", "Provider registration", "Create Your Provider Account", null], ["cart", "Cart", "Your Cart", null],
    ["checkout", "Checkout", "Checkout", null], ["saved", "Saved providers", "Saved Providers", null],
  ] as const;
  for (const [pageKey, label, metaTitle, metaDescription] of seoPages) {
    await prisma.pageSeo.create({ data: { pageKey, label, metaTitle, metaDescription, noIndex: ["login", "register", "cart", "checkout", "saved"].includes(pageKey) } });
  }

  console.log(`Done. ${createdProviders.length} providers, ${events.length} analytics events.`);
  console.log(`Admin login:    ${adminEmail} / ${adminPass}   → /admin/login`);
  console.log(`Provider login: provider@rangedoc.com / Provider@123   → /login`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
