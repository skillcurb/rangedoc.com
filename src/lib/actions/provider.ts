"use server";
/**
 * Provider dashboard server actions.
 * Every action re-checks the logged-in provider AND their plan limits on
 * the server, so limits can't be bypassed from the browser.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireProvider, verifyPassword } from "@/lib/auth";
import { providerFeatures } from "@/lib/plans";
import { getFreePlan } from "@/lib/queries";
import { DAYS } from "@/lib/hours";
import { SOCIAL_FIELDS, cleanUrl, parseVideo } from "@/lib/video";
import { onContentChanged } from "@/lib/sitemap";

export type ActionState = { ok?: boolean; error?: string; message?: string } | null;

async function ctx() {
  const user = await requireProvider();
  const provider = await prisma.provider.findUniqueOrThrow({ where: { id: user.providerId }, include: { plan: true } });
  if (provider.claimStatus === "PENDING") throw new Error("Your claim is still being verified.");
  return { user, provider, features: providerFeatures(provider, await getFreePlan()) };
}

function done(message = "Saved"): ActionState {
  revalidatePath("/dashboard", "layout");
  return { ok: true, message };
}

/** Same as done(), for changes visible on the public profile: also rebuilds the sitemap + pings search engines */
async function doneFor(slug: string, message = "Saved"): Promise<ActionState> {
  await onContentChanged([`/provider/${slug}`]);
  revalidatePath(`/provider/${slug}`);
  return done(message);
}
const err = (e: unknown): ActionState => ({ error: e instanceof z.ZodError ? e.issues[0].message : e instanceof Error ? e.message : "Something went wrong" });
const ids = (fd: FormData, key: string) => fd.getAll(key).map(Number).filter((n) => Number.isInteger(n) && n > 0);
const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};

// ───────────────────────────── Profile ─────────────────────────────

const profileSchema = z.object({
  prefix: z.string().max(20).optional(),
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  credentials: z.string().max(80).optional(),
  providerType: z.enum(["PHYSICAL_THERAPIST", "CHIROPRACTOR"]),
  headline: z.string().max(160).optional(),
  practiceName: z.string().max(190).optional(),
  phone: z.string().max(40).optional(),
  email: z.union([z.email("Enter a valid public email"), z.literal("")]).optional(),
  website: z.string().max(190).optional(),
  gender: z.string().max(30).optional(),
  languages: z.string().max(255).optional(),
  education: z.string().max(190).optional(),
  yearsExperience: z.coerce.number().int().min(0).max(80).optional().or(z.literal("")),
});

export async function saveProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { provider, features } = await ctx();
    const d = profileSchema.parse(Object.fromEntries(fd));
    await prisma.provider.update({
      where: { id: provider.id },
      data: {
        prefix: d.prefix || null,
        firstName: d.firstName,
        lastName: d.lastName,
        credentials: d.credentials || null,
        providerType: d.providerType,
        headline: d.headline || null,
        practiceName: d.practiceName || null,
        phone: d.phone || null,
        email: d.email || null,
        website: d.website || null,
        gender: d.gender || null,
        languages: d.languages || null,
        education: d.education || null,
        yearsExperience: d.yearsExperience === "" || d.yearsExperience == null ? null : d.yearsExperience,
        photo: str(fd, "photo"),
        bio: str(fd, "bio"),
        quote: str(fd, "quote"),
        bestMatch: str(fd, "bestMatch"),
        bestMatchPoints: str(fd, "bestMatchPoints"),
        responseTime: str(fd, "responseTime"),
        acceptingNewPatients: fd.get("acceptingNewPatients") === "on",
        inPerson: fd.get("inPerson") === "on",
        telehealth: fd.get("telehealth") === "on",
        // Paid-plan fields are only saved when the plan allows them
        ...(features.allowRatingDisplay
          ? {
              displayRating: fd.get("displayRating") ? Math.min(5, Math.max(0, Number(fd.get("displayRating")))) : null,
              displayReviewCount: fd.get("displayReviewCount") ? Number(fd.get("displayReviewCount")) : null,
              ratingSource: str(fd, "ratingSource"),
              endorsement: str(fd, "endorsement"),
            }
          : {}),
        metaTitle: str(fd, "metaTitle"),
        metaDescription: str(fd, "metaDescription"),
        conditions: { set: ids(fd, "conditionIds").map((id) => ({ id })) },
        specialties: { set: ids(fd, "specialtyIds").map((id) => ({ id })) },
        insurances: { set: ids(fd, "insuranceIds").map((id) => ({ id })) },
      },
    });
    revalidatePath(`/provider/${provider.slug}`);
    return doneFor(provider.slug, "Profile saved");
  } catch (e) {
    return err(e);
  }
}

// ───────────────────────────── Locations ─────────────────────────────

const locationSchema = z.object({
  id: z.coerce.number().int().optional().or(z.literal("")),
  name: z.string().trim().min(2, "Location name is required").max(190),
  address: z.string().trim().min(3, "Street address is required").max(190),
  address2: z.string().max(190).optional(),
  cityId: z.coerce.number().int().positive("Choose a city"),
  zip: z.string().trim().min(3, "ZIP is required").max(20),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  phone: z.string().max(40).optional(),
});

export async function saveLocation(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { provider, features } = await ctx();
    const d = locationSchema.parse(Object.fromEntries(fd));
    const city = await prisma.city.findUniqueOrThrow({ where: { id: d.cityId } });
    const data = { name: d.name, address: d.address, address2: d.address2 || null, cityId: city.id, cityName: city.name, state: city.stateCode, zip: d.zip, lat: d.lat, lng: d.lng, phone: d.phone || null };
    if (d.id) {
      await prisma.providerLocation.updateMany({ where: { id: d.id, providerId: provider.id }, data });
    } else {
      const count = await prisma.providerLocation.count({ where: { providerId: provider.id } });
      if (count >= features.maxLocations) return { error: `Your plan allows ${features.maxLocations} location(s). Upgrade to add more.` };
      await prisma.providerLocation.create({ data: { ...data, providerId: provider.id, isPrimary: count === 0, sortOrder: count } });
    }
    // Keep the provider's main city in sync with the primary location
    const primary = await prisma.providerLocation.findFirst({ where: { providerId: provider.id, isPrimary: true } });
    if (primary?.cityId) await prisma.provider.update({ where: { id: provider.id }, data: { cityId: primary.cityId } });
    return doneFor(provider.slug, "Location saved");
  } catch (e) {
    return err(e);
  }
}

export async function deleteLocation(id: number) {
  const { provider } = await ctx();
  await prisma.providerLocation.deleteMany({ where: { id, providerId: provider.id } });
  const left = await prisma.providerLocation.findMany({ where: { providerId: provider.id }, orderBy: { sortOrder: "asc" } });
  if (left.length && !left.some((l) => l.isPrimary)) await prisma.providerLocation.update({ where: { id: left[0].id }, data: { isPrimary: true } });
  return doneFor(provider.slug, "Location removed");
}

export async function makePrimaryLocation(id: number) {
  const { provider } = await ctx();
  await prisma.providerLocation.updateMany({ where: { providerId: provider.id }, data: { isPrimary: false } });
  await prisma.providerLocation.updateMany({ where: { id, providerId: provider.id }, data: { isPrimary: true } });
  return doneFor(provider.slug, "Primary location updated");
}

// ───────────────────────────── Gallery ─────────────────────────────

export async function addGalleryImages(urls: string[]) {
  try {
    const { provider, features } = await ctx();
    const count = await prisma.galleryImage.count({ where: { providerId: provider.id } });
    const room = features.maxPhotos - count;
    if (room <= 0) return { error: `Your plan allows ${features.maxPhotos} photos. Upgrade to add more.` };
    // Only allow the provider's own uploads (or seed images) to be attached
    const own = await prisma.media.findMany({ where: { providerId: provider.id, url: { in: urls } }, select: { url: true, alt: true } });
    const list = own.slice(0, room);
    await prisma.galleryImage.createMany({ data: list.map((m, i) => ({ providerId: provider.id, url: m.url, alt: m.alt, sortOrder: count + i })) });
    return doneFor(provider.slug, list.length < urls.length ? `Added ${list.length} photo(s) — plan limit reached.` : "Photos added");
  } catch (e) {
    return err(e);
  }
}

export async function removeGalleryImage(id: number) {
  const { provider } = await ctx();
  await prisma.galleryImage.deleteMany({ where: { id, providerId: provider.id } });
  return doneFor(provider.slug, "Photo removed");
}

export async function moveGalleryImage(id: number, dir: -1 | 1) {
  const { provider } = await ctx();
  const list = await prisma.galleryImage.findMany({ where: { providerId: provider.id }, orderBy: { sortOrder: "asc" } });
  const i = list.findIndex((g) => g.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return doneFor(provider.slug);
  [list[i], list[j]] = [list[j], list[i]];
  await prisma.$transaction(list.map((g, idx) => prisma.galleryImage.update({ where: { id: g.id }, data: { sortOrder: idx } })));
  return doneFor(provider.slug, "Order updated");
}

export async function updateGalleryAlt(id: number, alt: string) {
  const { provider } = await ctx();
  await prisma.galleryImage.updateMany({ where: { id, providerId: provider.id }, data: { alt: alt.slice(0, 190) } });
  return doneFor(provider.slug, "Alt text saved");
}

// ───────────────────────────── FAQs ─────────────────────────────

const faqSchema = z.object({
  id: z.coerce.number().int().optional().or(z.literal("")),
  question: z.string().trim().min(5, "Question is too short").max(500),
  answer: z.string().trim().min(2, "Answer is required").max(5000),
});

export async function saveFaq(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { provider, features } = await ctx();
    const d = faqSchema.parse(Object.fromEntries(fd));
    if (d.id) {
      await prisma.providerFaq.updateMany({ where: { id: d.id, providerId: provider.id }, data: { question: d.question, answer: d.answer } });
    } else {
      const count = await prisma.providerFaq.count({ where: { providerId: provider.id } });
      if (count >= features.maxFaqs) return { error: `Your plan allows ${features.maxFaqs} FAQs. Upgrade for unlimited FAQs.` };
      await prisma.providerFaq.create({ data: { providerId: provider.id, question: d.question, answer: d.answer, sortOrder: count } });
    }
    return doneFor(provider.slug, "FAQ saved");
  } catch (e) {
    return err(e);
  }
}

export async function deleteFaq(id: number) {
  const { provider } = await ctx();
  await prisma.providerFaq.deleteMany({ where: { id, providerId: provider.id } });
  return doneFor(provider.slug, "FAQ deleted");
}

// ───────────────────────────── Availability ─────────────────────────────

export async function saveAvailability(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { provider } = await ctx();
    const hours: Record<string, { open: string; close: string; closed: boolean }> = {};
    for (const d of DAYS) {
      const closed = fd.get(`${d.key}_closed`) === "on";
      const open = String(fd.get(`${d.key}_open`) ?? "");
      const close = String(fd.get(`${d.key}_close`) ?? "");
      if (!closed && (!open || !close || open >= close)) return { error: `Check the hours for ${d.label}.` };
      hours[d.key] = { open, close, closed };
    }
    const slot = Number(fd.get("slotMinutes")) || 30;
    await prisma.provider.update({ where: { id: provider.id }, data: { officeHours: hours, slotMinutes: [15, 20, 30, 45, 60, 90].includes(slot) ? slot : 30, acceptingNewPatients: fd.get("acceptingNewPatients") === "on" } });
    return doneFor(provider.slug, "Availability saved");
  } catch (e) {
    return err(e);
  }
}

// ───────────────────────────── Leads ─────────────────────────────

export async function updateAppointment(id: number, status: "NEW" | "CONFIRMED" | "CANCELLED" | "COMPLETED", note?: string) {
  const { provider } = await ctx();
  await prisma.appointmentRequest.updateMany({ where: { id, providerId: provider.id }, data: { status, ...(note !== undefined ? { providerNote: note } : {}) } });
  return done("Appointment updated");
}

export async function markMessage(id: number, read: boolean) {
  const { provider } = await ctx();
  await prisma.providerMessage.updateMany({ where: { id, providerId: provider.id }, data: { read } });
  return done(read ? "Marked as read" : "Marked as unread");
}

export async function deleteMessage(id: number) {
  const { provider } = await ctx();
  await prisma.providerMessage.deleteMany({ where: { id, providerId: provider.id } });
  return done("Message deleted");
}

// ─────────────────────── Videos & social links (paid) ───────────────────────

/** Intro video + social network links */
export async function saveMediaLinks(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { provider, features } = await ctx();
    const data: Record<string, string | null> = {};
    if (features.allowVideo) {
      const intro = str(fd, "videoUrl");
      if (intro && parseVideo(intro)?.kind === "unknown") return { error: "Intro video must be a YouTube/Vimeo link or an uploaded video file." };
      data.videoUrl = intro;
    }
    if (features.allowSocialLinks) {
      for (const f of SOCIAL_FIELDS) {
        const raw = fd.get(f.key);
        const url = cleanUrl(raw);
        if (typeof raw === "string" && raw.trim() && !url) return { error: `${f.label} link is not a valid URL.` };
        data[f.key] = url;
      }
    }
    if (!Object.keys(data).length) return { error: "Upgrade your plan to add videos and social links." };
    await prisma.provider.update({ where: { id: provider.id }, data });
    revalidatePath(`/provider/${provider.slug}`);
    return doneFor(provider.slug, "Saved");
  } catch (e) {
    return err(e);
  }
}

const videoSchema = z.object({
  id: z.coerce.number().int().optional().or(z.literal("")),
  title: z.string().trim().min(2, "Give the video a title").max(190),
  url: z.string().trim().min(5, "Add a video link or upload a video").max(500),
  thumbnail: z.string().max(500).optional(),
});

/** Add / edit a video in the video gallery (limited by plan.maxVideos) */
export async function saveVideo(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { provider, features } = await ctx();
    const d = videoSchema.parse(Object.fromEntries(fd));
    const info = parseVideo(d.url);
    if (!info || info.kind === "unknown") return { error: "Use a YouTube or Vimeo link, or upload an MP4/WebM video." };
    const data = { title: d.title, url: d.url, thumbnail: d.thumbnail || info.thumbnail };
    if (d.id) {
      await prisma.providerVideo.updateMany({ where: { id: d.id, providerId: provider.id }, data });
    } else {
      const count = await prisma.providerVideo.count({ where: { providerId: provider.id } });
      if (count >= features.maxVideos) return { error: features.maxVideos ? `Your plan allows ${features.maxVideos} videos.` : "Upgrade your plan to add a video gallery." };
      await prisma.providerVideo.create({ data: { ...data, providerId: provider.id, sortOrder: count } });
    }
    revalidatePath(`/provider/${provider.slug}`);
    return doneFor(provider.slug, "Video saved");
  } catch (e) {
    return err(e);
  }
}

export async function deleteVideo(id: number) {
  const { provider } = await ctx();
  await prisma.providerVideo.deleteMany({ where: { id, providerId: provider.id } });
  return doneFor(provider.slug, "Video removed");
}

export async function moveVideo(id: number, dir: -1 | 1) {
  const { provider } = await ctx();
  const list = await prisma.providerVideo.findMany({ where: { providerId: provider.id }, orderBy: { sortOrder: "asc" } });
  const i = list.findIndex((v) => v.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return doneFor(provider.slug);
  [list[i], list[j]] = [list[j], list[i]];
  await prisma.$transaction(list.map((v, idx) => prisma.providerVideo.update({ where: { id: v.id }, data: { sortOrder: idx } })));
  return doneFor(provider.slug, "Order updated");
}

// ───────────────────────────── Account ─────────────────────────────

export async function saveAccount(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireProvider();
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    if (name.length < 2) return { error: "Enter your name" };
    if (!z.email().safeParse(email).success) return { error: "Enter a valid email" };
    const other = await prisma.user.findFirst({ where: { email, id: { not: user.id } } });
    if (other) return { error: "That email is already used by another account" };
    const data: { name: string; email: string; passwordHash?: string } = { name, email };
    const newPass = String(fd.get("newPassword") ?? "");
    if (newPass) {
      const full = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      if (!(await verifyPassword(String(fd.get("currentPassword") ?? ""), full.passwordHash))) return { error: "Current password is incorrect" };
      if (newPass.length < 8) return { error: "New password must be at least 8 characters" };
      data.passwordHash = await hashPassword(newPass);
    }
    await prisma.user.update({ where: { id: user.id }, data });
    return done("Account updated");
  } catch (e) {
    return err(e);
  }
}
