"use server";
/**
 * Authentication server actions:
 * login (providers + admins), logout, provider registration / claiming,
 * forgot password and reset password.
 */
import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, t, eq, and, gt, insertId } from "@/lib/db";
import { endSession, hashPassword, startSession, verifyPassword } from "@/lib/auth";
import { emailLayout, esc, sendMail } from "@/lib/email";
import { getFreePlan } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { siteUrl, slugify } from "@/lib/utils";
import { DEFAULT_HOURS } from "@/lib/hours";
import { onContentChanged } from "@/lib/sitemap";

export type FormState = { ok?: boolean; error?: string; message?: string } | null;

/** Only allow internal redirect targets ("/dashboard", not "https://evil.com") */
function safeNext(next: unknown, fallback: string) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

// ───────────────────────────── Login ─────────────────────────────

const loginSchema = z.object({ email: z.email("Enter a valid email"), password: z.string().min(1, "Enter your password") });

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const role = formData.get("role") === "ADMIN" ? "ADMIN" : "PROVIDER";
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const user = await db.query.users.findFirst({ where: eq(t.users.email, parsed.data.email.toLowerCase()) });
  // Same message for unknown email / wrong password (don't reveal which accounts exist)
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash)) || user.role !== role) {
    return { error: "Incorrect email or password." };
  }
  await startSession({ userId: user.id, role: user.role });
  redirect(safeNext(formData.get("next"), role === "ADMIN" ? "/admin" : "/dashboard"));
}

export async function logoutAction(formData?: FormData) {
  await endSession();
  redirect(formData?.get("to") === "admin" ? "/admin/login" : "/login");
}

// ───────────────────────────── Register ─────────────────────────────

const accountSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  phone: z.string().trim().max(40).optional(),
  terms: z.literal("on", { error: "Please accept the terms" }),
});

const newListingSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  credentials: z.string().trim().max(80).optional(),
  providerType: z.enum(["PHYSICAL_THERAPIST", "CHIROPRACTOR"]),
  practiceName: z.string().trim().max(160).optional(),
  cityId: z.coerce.number().int().positive("Choose your city"),
  address: z.string().trim().min(3, "Enter your street address").max(200),
  zip: z.string().trim().min(3, "Enter your ZIP code").max(20),
  licenseNumber: z.string().trim().max(80).optional(),
});

async function uniqueProviderSlug(base: string) {
  const root = slugify(base) || "provider";
  let s = root;
  for (let i = 2; await db.query.providers.findFirst({ where: eq(t.providers.slug, s), columns: { id: true } }); i++) s = `${root}-${i}`;
  return s;
}

export async function registerAction(_: FormState, formData: FormData): Promise<FormState> {
  const data = Object.fromEntries(formData);
  const acc = accountSchema.safeParse(data);
  if (!acc.success) return { error: acc.error.issues[0].message };
  const email = acc.data.email.toLowerCase();
  if (await db.query.users.findFirst({ where: eq(t.users.email, email), columns: { id: true } })) return { error: "An account with this email already exists. Please log in." };

  const claimId = Number(formData.get("providerId")) || null;
  let providerId: number;

  if (claimId) {
    // ---- Claim an existing profile (admin verifies before it goes live) ----
    const provider = await db.query.providers.findFirst({ where: eq(t.providers.id, claimId), with: { user: true } });
    if (!provider) return { error: "Profile not found." };
    if (provider.claimStatus !== "UNCLAIMED" || provider.user) return { error: "This profile has already been claimed or a claim is pending." };
    if (formData.get("confirmOwner") !== "on") return { error: "Please confirm that you are this provider." };
    await db
      .update(t.providers)
      .set({
        claimStatus: "PENDING",
        claimNote: `Claimed by ${acc.data.name} <${email}> ${acc.data.phone ?? ""}. License #: ${formData.get("licenseNumber") || "—"}. ${formData.get("claimMessage") || ""}`.trim(),
      })
      .where(eq(t.providers.id, claimId));
    providerId = claimId;
  } else {
    // ---- Create a brand-new listing (goes live immediately as a free claimed profile) ----
    const listing = newListingSchema.safeParse(data);
    if (!listing.success) return { error: listing.error.issues[0].message };
    const l = listing.data;
    const city = await db.query.cities.findFirst({ where: eq(t.cities.id, l.cityId) });
    if (!city) return { error: "Choose your city" };
    const freePlan = await getFreePlan();
    const slug = await uniqueProviderSlug(`dr ${l.firstName} ${l.lastName} ${city.name}`);
    // Provider + its first (primary) location are created together
    providerId = await db.transaction(async (tx) => {
      const id = await insertId(
        tx.insert(t.providers).values({
          slug,
          prefix: "Dr.",
          firstName: l.firstName,
          lastName: l.lastName,
          credentials: l.credentials || null,
          providerType: l.providerType,
          headline: l.providerType === "CHIROPRACTOR" ? "Chiropractor" : "Physical Therapist",
          practiceName: l.practiceName || null,
          phone: acc.data.phone || null,
          email,
          licenseNumber: l.licenseNumber || null,
          claimStatus: "CLAIMED",
          claimedAt: new Date(),
          planId: freePlan?.id ?? null,
          cityId: city.id,
          officeHours: DEFAULT_HOURS,
        }),
      );
      await tx.insert(t.providerLocations).values({
        providerId: id,
        name: l.practiceName || `${l.firstName} ${l.lastName}`,
        address: l.address,
        cityId: city.id,
        cityName: city.name,
        state: city.stateCode,
        zip: l.zip,
        lat: city.lat, // refine on the map in Dashboard → Locations
        lng: city.lng,
        isPrimary: true,
      });
      return id;
    });
    // New public profile → rebuild sitemap and notify search engines
    await onContentChanged([`/provider/${slug}`]);
  }

  const userId = await insertId(
    db.insert(t.users).values({ name: acc.data.name, email, passwordHash: await hashPassword(acc.data.password), role: "PROVIDER", providerId }),
  );

  // Tell the admin
  const s = await getSettings();
  const adminTo = s.email.adminNotifyEmail;
  if (adminTo) {
    await sendMail({
      to: adminTo,
      subject: claimId ? "New profile claim to verify" : "New provider listing",
      html: await emailLayout(claimId ? "Profile claim pending" : "New listing", `<p>${esc(acc.data.name)} (${esc(email)}) ${claimId ? "claimed a profile" : "created a listing"}.</p><p><a href="${siteUrl("/admin/claims")}">Review in admin</a></p>`),
    });
  }

  await startSession({ userId, role: "PROVIDER" });
  redirect(safeNext(formData.get("next"), "/dashboard"));
}

// ─────────────────────────── Password reset ───────────────────────────

export async function forgotPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const user = email ? await db.query.users.findFirst({ where: eq(t.users.email, email) }) : null;
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    await db
      .update(t.users)
      .set({ resetToken: token, resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000) })
      .where(eq(t.users.id, user.id));
    const link = siteUrl(`/reset-password?token=${token}`);
    await sendMail({ to: user.email, subject: "Reset your password", html: await emailLayout("Reset your password", `<p>Click the link below to choose a new password (valid for 1 hour):</p><p><a href="${link}">${link}</a></p>`) });
    if (process.env.NODE_ENV !== "production") console.info("[dev] password reset link:", link);
  }
  // Always the same answer so nobody can probe which emails exist
  return { ok: true, message: "If that email has an account, we've sent a reset link." };
}

export async function resetPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters" };
  if (password !== formData.get("confirm")) return { error: "Passwords do not match" };
  // An empty token must never match (users without a reset token have NULL)
  const user = token ? await db.query.users.findFirst({ where: and(eq(t.users.resetToken, token), gt(t.users.resetTokenExpires, new Date())) }) : undefined;
  if (!user) return { error: "This reset link is invalid or has expired." };
  await db
    .update(t.users)
    .set({ passwordHash: await hashPassword(password), resetToken: null, resetTokenExpires: null })
    .where(eq(t.users.id, user.id));
  await startSession({ userId: user.id, role: user.role });
  redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");
}
