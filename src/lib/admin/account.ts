"use server";
/**
 * Admin "My Account" actions: update profile, change password,
 * unlink Google / Facebook sign-in.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, t, eq, and, ne } from "@/lib/db";
import { assertAdmin, hashPassword, verifyPassword } from "@/lib/auth";

export type AccountState = { ok?: boolean; error?: string; message?: string } | null;

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.email("Enter a valid email"),
  avatar: z.string().max(500).optional(),
});

export async function saveAdminProfile(_: AccountState, fd: FormData): Promise<AccountState> {
  const me = await assertAdmin();
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const email = parsed.data.email.toLowerCase();
  if (await db.query.users.findFirst({ where: and(eq(t.users.email, email), ne(t.users.id, me.id)) })) return { error: "That email is used by another account." };
  await db.update(t.users).set({ name: parsed.data.name, email, avatar: parsed.data.avatar || null }).where(eq(t.users.id, me.id));
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Profile updated" };
}

export async function changeAdminPassword(_: AccountState, fd: FormData): Promise<AccountState> {
  const me = await assertAdmin();
  const current = String(fd.get("currentPassword") ?? "");
  const next = String(fd.get("newPassword") ?? "");
  const confirm = String(fd.get("confirmPassword") ?? "");
  const user = await db.query.users.findFirst({ where: eq(t.users.id, me.id) });
  if (!user) throw new Error("User not found");
  if (!(await verifyPassword(current, user.passwordHash))) return { error: "Current password is incorrect." };
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) return { error: "Use letters and numbers in your new password." };
  if (next !== confirm) return { error: "The new passwords don't match." };
  await db.update(t.users).set({ passwordHash: await hashPassword(next) }).where(eq(t.users.id, me.id));
  return { ok: true, message: "Password changed" };
}

export async function unlinkSocial(provider: "google" | "facebook"): Promise<AccountState> {
  const me = await assertAdmin();
  await db
    .update(t.users)
    .set(provider === "google" ? { googleId: null } : { facebookId: null })
    .where(eq(t.users.id, me.id));
  revalidatePath("/admin/account");
  return { ok: true, message: `${provider === "google" ? "Google" : "Facebook"} unlinked` };
}
