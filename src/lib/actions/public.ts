"use server";
/**
 * Server actions for public (visitor) forms:
 * appointment requests, "email provider", reviews, contact form,
 * blog comments and blog ratings.
 *
 * Every action validates input with zod and returns { ok, error? }
 * so the client can show a toast.
 */
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { db, t, eq, and, inArray, sql, isDuplicateKey } from "@/lib/db";
import { recordEvents } from "@/lib/analytics";
import { emailLayout, esc, sendMail } from "@/lib/email";
import { verifyCaptcha } from "@/lib/captcha";
import { getSettings } from "@/lib/settings";
import { providerFeatures } from "@/lib/plans";
import { formatTime } from "@/lib/hours";
import { formatDate, providerName, siteUrl } from "@/lib/utils";
import { getFreePlan } from "@/lib/queries";

export type ActionResult = { ok: boolean; error?: string; message?: string };

async function visitorCtx() {
  const [jar, h] = await Promise.all([cookies(), headers()]);
  return { visitorId: jar.get("rd_vid")?.value ?? null, userAgent: h.get("user-agent"), headers: h };
}

const fail = (error: string): ActionResult => ({ ok: false, error });

// ─────────────────────────── Appointment request ───────────────────────────

const appointmentSchema = z.object({
  providerId: z.coerce.number().int().positive(),
  locationId: z.coerce.number().int().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose a date"),
  timeSlot: z.string().regex(/^\d{2}:\d{2}$/, "Please choose a time"),
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z.email("Enter a valid email"),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(40),
  dateOfBirth: z.string().max(20).optional(),
  isNewPatient: z.string().optional(),
  insurance: z.string().max(120).optional(),
  reason: z.string().max(2000).optional(),
  preferredContact: z.enum(["email", "phone", "text"]).optional(),
});

export async function requestAppointment(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = appointmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const d = parsed.data;
  const provider = await db.query.providers.findFirst({ where: eq(t.providers.id, d.providerId), with: { user: true } });
  if (!provider) return fail("Provider not found");

  // Don't allow double-booking the same slot
  const clash = await db.query.appointmentRequests.findFirst({
    where: and(
      eq(t.appointmentRequests.providerId, d.providerId),
      eq(t.appointmentRequests.date, new Date(`${d.date}T00:00:00.000Z`)),
      eq(t.appointmentRequests.timeSlot, d.timeSlot),
      inArray(t.appointmentRequests.status, ["NEW", "CONFIRMED"]),
    ),
    columns: { id: true },
  });
  if (clash) return fail("Sorry, that time was just taken. Please choose another.");

  const ctx = await visitorCtx();
  await db.insert(t.appointmentRequests).values({
    providerId: d.providerId,
    locationId: d.locationId,
    date: new Date(`${d.date}T00:00:00.000Z`),
    timeSlot: d.timeSlot,
    firstName: d.firstName,
    lastName: d.lastName,
    email: d.email,
    phone: d.phone,
    dateOfBirth: d.dateOfBirth || null,
    isNewPatient: d.isNewPatient !== "no",
    insurance: d.insurance || null,
    reason: d.reason || null,
    preferredContact: d.preferredContact ?? null,
    visitorId: ctx.visitorId,
  });
  await recordEvents([{ type: "APPOINTMENT_SUBMIT", providerId: d.providerId, path: `/provider/${provider.slug}` }], ctx).catch(() => undefined);

  // Notify the provider (profile email, else account email) + confirm to the patient
  const to = provider.email || provider.user?.email;
  const when = `${formatDate(`${d.date}T12:00:00`, { weekday: "long", month: "long", day: "numeric" })} at ${formatTime(d.timeSlot)}`;
  if (to) {
    await sendMail({
      to,
      replyTo: d.email,
      subject: `New appointment request – ${d.firstName} ${d.lastName}`,
      html: await emailLayout(
        "New appointment request",
        `<p><b>${esc(d.firstName)} ${esc(d.lastName)}</b> requested <b>${when}</b>.</p>
         <p>Email: ${esc(d.email)}<br/>Phone: ${esc(d.phone)}<br/>Insurance: ${esc(d.insurance) || "—"}<br/>New patient: ${d.isNewPatient !== "no" ? "Yes" : "No"}</p>
         <p>Reason: ${esc(d.reason) || "—"}</p><p><a href="${siteUrl("/dashboard/appointments")}">Open your dashboard</a></p>`,
      ),
    });
  }
  await sendMail({
    to: d.email,
    subject: `Your appointment request with ${providerName(provider)}`,
    html: await emailLayout("Request received", `<p>Hi ${esc(d.firstName)}, your request for <b>${when}</b> was sent to ${esc(providerName(provider))}. They will contact you to confirm.</p>`),
  });
  return { ok: true, message: "Your request was sent! The office will contact you to confirm." };
}

// ─────────────────────────── Email provider ───────────────────────────

const messageSchema = z.object({
  providerId: z.coerce.number().int().positive(),
  name: z.string().trim().min(2, "Please enter your name").max(120),
  contact: z.string().trim().min(5, "Enter your email or phone").max(160),
  subject: z.string().trim().min(2, "Please add a subject").max(200),
  message: z.string().trim().min(10, "Message is too short").max(5000),
  website: z.string().max(0).optional(), // honeypot – bots fill hidden fields
});

export async function sendProviderMessage(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = messageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const d = parsed.data;
  const provider = await db.query.providers.findFirst({ where: eq(t.providers.id, d.providerId), with: { user: true } });
  if (!provider) return fail("Provider not found");

  const ctx = await visitorCtx();
  await db.insert(t.providerMessages).values({ providerId: d.providerId, name: d.name, contact: d.contact, subject: d.subject, message: d.message, visitorId: ctx.visitorId });
  await recordEvents([{ type: "EMAIL_SUBMIT", providerId: d.providerId, path: `/provider/${provider.slug}` }], ctx).catch(() => undefined);

  const to = provider.email || provider.user?.email;
  if (to) {
    await sendMail({
      to,
      replyTo: d.contact.includes("@") ? d.contact : undefined,
      subject: `[${(await getSettings()).general.siteName}] ${d.subject}`,
      html: await emailLayout(`Message from ${esc(d.name)}`, `<p>${esc(d.message).replace(/\n/g, "<br/>")}</p><p>Reply to: <b>${esc(d.contact)}</b></p>`),
    });
  }
  return { ok: true, message: "Message sent! The provider will get back to you soon." };
}

// ─────────────────────────── Reviews ───────────────────────────

const reviewSchema = z.object({
  providerId: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1, "Please choose a star rating").max(5),
  authorName: z.string().trim().min(2, "Please enter your name").max(100),
  authorEmail: z.email("Enter a valid email").optional().or(z.literal("")),
  title: z.string().max(150).optional(),
  body: z.string().trim().min(10, "Please write at least a few words").max(3000),
});

export async function submitReview(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const d = parsed.data;
  const provider = await db.query.providers.findFirst({ where: eq(t.providers.id, d.providerId), with: { plan: true } });
  if (!provider) return fail("Provider not found");
  // Reviews are a paid-plan feature
  if (!providerFeatures(provider, await getFreePlan()).allowReviews) return fail("Reviews are not available for this provider.");

  const ctx = await visitorCtx();
  if (ctx.visitorId) {
    const already = await db.$count(t.reviews, and(eq(t.reviews.providerId, d.providerId), eq(t.reviews.visitorId, ctx.visitorId)));
    if (already) return fail("You have already reviewed this provider.");
  }
  await db.insert(t.reviews).values({
    providerId: d.providerId,
    rating: d.rating,
    authorName: d.authorName,
    authorEmail: d.authorEmail || null,
    title: d.title || null,
    body: d.body,
    visitorId: ctx.visitorId,
  });
  return { ok: true, message: "Thank you! Your review will appear after moderation." };
}

// ─────────────────────────── Contact form (reCAPTCHA) ───────────────────────────

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.email("Enter a valid email"),
  phone: z.string().max(40).optional(),
  subject: z.string().trim().min(2, "Please add a subject").max(200),
  message: z.string().trim().min(10, "Message is too short").max(5000),
});

export async function submitContact(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ok = await verifyCaptcha(formData.get("g-recaptcha-response") as string | null);
  if (!ok) return fail("Please confirm you are not a robot.");
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const d = parsed.data;
  await db.insert(t.contactMessages).values({ ...d, phone: d.phone || null });
  const s = await getSettings();
  const to = s.email.adminNotifyEmail || s.general.contactEmail;
  if (to) {
    await sendMail({
      to,
      replyTo: d.email,
      subject: `Contact form: ${d.subject}`,
      html: await emailLayout(`Message from ${esc(d.name)}`, `<p>${esc(d.message).replace(/\n/g, "<br/>")}</p><p>${esc(d.email)} ${esc(d.phone)}</p>`),
    });
  }
  return { ok: true, message: "Thanks! We'll get back to you shortly." };
}

// ─────────────────────────── Blog comments & ratings ───────────────────────────

const commentSchema = z.object({
  postId: z.coerce.number().int().positive(),
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.email("Enter a valid email"),
  body: z.string().trim().min(3, "Comment is too short").max(3000),
  website: z.string().max(0).optional(), // honeypot
});

export async function submitBlogComment(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = commentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { website: _hp, ...data } = parsed.data;
  await db.insert(t.blogComments).values(data);
  return { ok: true, message: "Thanks! Your comment will appear after approval." };
}

export async function rateBlogPost(postId: number, rating: number): Promise<ActionResult & { avg?: number; count?: number }> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail("Invalid rating");
  const ctx = await visitorCtx();
  if (!ctx.visitorId) return fail("Please enable cookies to rate articles.");
  const visitorId = ctx.visitorId;

  // One rating per post + visitor (unique index). A repeat vote replaces the
  // old one, and the post's running totals (ratingSum / ratingCount) are
  // adjusted in the same transaction.
  const save = () =>
    db.transaction(async (tx) => {
      const existing = await tx.query.blogRatings.findFirst({ where: and(eq(t.blogRatings.postId, postId), eq(t.blogRatings.visitorId, visitorId)) });
      if (existing) {
        await tx.update(t.blogRatings).set({ rating }).where(eq(t.blogRatings.id, existing.id));
        await tx
          .update(t.blogPosts)
          .set({ ratingSum: sql`${t.blogPosts.ratingSum} + ${rating - existing.rating}` })
          .where(eq(t.blogPosts.id, postId));
      } else {
        await tx.insert(t.blogRatings).values({ postId, visitorId, rating });
        await tx
          .update(t.blogPosts)
          .set({ ratingSum: sql`${t.blogPosts.ratingSum} + ${rating}`, ratingCount: sql`${t.blogPosts.ratingCount} + 1` })
          .where(eq(t.blogPosts.id, postId));
      }
    });
  try {
    await save();
  } catch (e) {
    // Two clicks at the same moment: the second insert hits the unique key.
    // Run again – this time the existing rating is found and updated.
    if (!isDuplicateKey(e)) throw e;
    await save();
  }
  const post = await db.query.blogPosts.findFirst({ where: eq(t.blogPosts.id, postId), columns: { ratingSum: true, ratingCount: true } });
  return { ok: true, avg: post && post.ratingCount ? post.ratingSum / post.ratingCount : rating, count: post?.ratingCount ?? 1 };
}
