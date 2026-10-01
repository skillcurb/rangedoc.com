"use server";
/**
 * Admin server actions (all require an ADMIN session).
 *  - saveRecord / deleteRecord / setField : generic CRUD for RESOURCES
 *  - approveClaim / rejectClaim           : profile claim verification
 *  - saveSettings                         : Settings pages
 *  - updateOrderStatus                    : product orders
 *
 * Form values are converted according to each field's type
 * (money → cents, list → JSON array, relationMany → join-table links …).
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, eq, and, ne, t, isDuplicateKey } from "@/lib/db";
import { assertAdmin, hashPassword } from "@/lib/auth";
import { getResource, type FieldDef, type ResourceDef } from "@/lib/admin/resources";
import { deleteRows, findBy, findRow, findRows, insertRow, LINKS, setLinks, updateRow } from "@/lib/admin/data";
import { DEFAULT_SETTINGS, getSettings, saveSettingsGroup, type SettingsGroup } from "@/lib/settings";
import { fulfilPlanOrder, sendOrderEmails } from "@/lib/payments/fulfil";
import { emailLayout, esc, sendMail } from "@/lib/email";
import { getFreePlan } from "@/lib/queries";
import { providerName, siteUrl, slugify, stripHtml } from "@/lib/utils";
import { onContentChanged } from "@/lib/sitemap";
import { SEO_PAGES } from "@/lib/seo";

/** Resources that never appear on the public site (no sitemap update needed) */
const PRIVATE_RESOURCES = new Set(["appointments", "messages", "contacts", "plan-orders", "orders", "users", "comments"]);

/**
 * Work out which public URLs a saved/deleted record affects, so search
 * engines can be told about them. Falls back to the home page.
 */
async function publicPaths(res: ResourceDef, record: any): Promise<string[]> {
  if (!record) return ["/"];
  if (res.viewPath) return [res.viewPath.replace(/\{(\w+)\}/g, (_: string, k: string) => String(record[k] ?? ""))];
  if (record.providerId) {
    const p = await db.query.providers.findFirst({ where: eq(t.providers.id, record.providerId), columns: { slug: true } });
    if (p) return [`/provider/${p.slug}`];
  }
  if (res.key === "seo") return [SEO_PAGES.find((x) => x.key === record.pageKey)?.path ?? "/"];
  if (res.key === "plans" || res.key === "testimonials") return ["/claim-your-profile"];
  if (res.key === "blocks" && String(record.section).startsWith("claim")) return ["/claim-your-profile"];
  if (res.key === "blocks" && String(record.section).startsWith("products")) return ["/products"];
  return ["/"];
}

/** Rebuild sitemap + notify search engines (skips private resources) */
async function contentChanged(res: ResourceDef, records: any[]) {
  if (PRIVATE_RESOURCES.has(res.key)) return;
  const paths = (await Promise.all(records.map((r) => publicPaths(res, r)))).flat();
  await onContentChanged(paths.length ? paths : ["/"]);
}

export type AdminState = { ok?: boolean; error?: string; message?: string; id?: number } | null;

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Make sure a slug is unique in its table */
async function uniqueSlug(res: ResourceDef, base: string, id?: number) {
  const root = slugify(base) || "item";
  let s = root;
  for (let i = 2; ; i++) {
    const hit = await findBy(res.model, "slug", s);
    if (!hit || hit.id === id) return s;
    s = `${root}-${i}`;
  }
}

/**
 * Convert submitted form values into column values using the field definitions.
 * Many-to-many fields are returned separately in `links` (saved to join tables).
 */
async function buildData(res: ResourceDef, fd: FormData, id?: number) {
  const data: Record<string, any> = {};
  const links: Record<string, number[]> = {};
  const str = (name: string) => {
    const v = fd.get(name);
    return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
  };
  for (const f of res.fields as FieldDef[]) {
    if (f.readOnly) continue;
    switch (f.type) {
      case "boolean":
        data[f.name] = fd.get(f.name) === "on";
        break;
      case "number": {
        const v = str(f.name);
        // Empty: NULL for optional columns, otherwise leave the database default/current value
        data[f.name] = v == null ? (f.nullable ? null : undefined) : Number(v);
        if (data[f.name] != null && Number.isNaN(data[f.name])) throw new Error(`${f.label} must be a number`);
        break;
      }
      case "money": {
        const v = str(f.name);
        data[f.name] = v == null ? (f.nullable ? null : undefined) : Math.round(Number(v.replace(/[$,]/g, "")) * 100);
        break;
      }
      case "relation": {
        const v = str(f.name);
        data[f.name] = v == null ? null : Number(v);
        break;
      }
      case "relationMany": {
        links[f.name] = fd.getAll(f.name).map(Number).filter((n) => n > 0);
        continue; // not a column of this table
      }
      case "list":
        data[f.name] = (str(f.name) ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
        break;
      case "images":
      case "json":
        try {
          data[f.name] = JSON.parse(str(f.name) ?? "[]");
        } catch {
          throw new Error(`${f.label} is not valid`);
        }
        break;
      case "date":
      case "datetime": {
        const v = str(f.name);
        data[f.name] = v ? new Date(f.type === "date" ? `${v}T00:00:00.000Z` : v) : null;
        break;
      }
      case "latlng":
        data.lat = Number(fd.get("lat"));
        data.lng = Number(fd.get("lng"));
        if (!Number.isFinite(data.lat) || !Number.isFinite(data.lng)) throw new Error("Please set the map position");
        break;
      case "password": {
        const v = str(f.name);
        if (v) {
          if (v.length < 8) throw new Error("Password must be at least 8 characters");
          data.passwordHash = await hashPassword(v);
        }
        break;
      }
      case "slug": {
        const sources = (f.from ?? "").split(",").map((s) => str(s.trim())).filter(Boolean).join(" ");
        data[f.name] = await uniqueSlug(res, str(f.name) ?? sources, id);
        break;
      }
      default:
        data[f.name] = str(f.name);
    }
    if (data[f.name] === undefined) delete data[f.name];
    if (f.required && (data[f.name] == null || data[f.name] === "") && f.type !== "latlng" && f.type !== "boolean") throw new Error(`${f.label} is required`);
  }
  return { data, links };
}

/** Resource-specific rules applied before saving */
async function beforeSave(res: ResourceDef, data: Record<string, any>, existing: any) {
  if (res.key === "posts") {
    if (data.published && !data.publishedAt) data.publishedAt = existing?.publishedAt ?? new Date();
    const words = stripHtml(data.content ?? "").split(" ").length;
    data.readingMinutes = Math.max(1, Math.round(words / 200));
  }
  if (res.key === "providers" && data.claimStatus === "CLAIMED" && !existing?.claimedAt) data.claimedAt = new Date();
  if (res.key === "plans" && data.isFree) data.priceCents = 0;
  if (res.key === "users") {
    if (!existing && !data.passwordHash) throw new Error("Password is required for new users");
    data.email = String(data.email).toLowerCase();
  }
  if (res.key === "reviews" && (data.rating < 1 || data.rating > 5)) throw new Error("Rating must be between 1 and 5");
}

/** Resource-specific side effects after saving */
async function afterSave(res: ResourceDef, record: any, existing: any) {
  if (res.key === "plan-orders" && record.status === "PAID" && existing?.status !== "PAID") {
    // Temporarily set back so fulfil logic runs (it skips already-paid orders)
    await db.update(t.planOrders).set({ status: "PENDING" }).where(eq(t.planOrders.id, record.id));
    await fulfilPlanOrder(record.orderNumber, record.paymentRef ?? "manual");
  }
  if (res.key === "plans" && record.isFree) {
    // Only one free plan
    await db.update(t.plans).set({ isFree: false }).where(and(ne(t.plans.id, record.id), eq(t.plans.isFree, true)));
  }
}

export async function saveRecord(resourceKey: string, id: number | null, _: AdminState, fd: FormData): Promise<AdminState> {
  await assertAdmin();
  const res = getResource(resourceKey);
  if (!res) return { error: "Unknown resource" };
  let savedId: number;
  try {
    const existing = id ? await findRow(res.model, id) : null;
    if (id && !existing) return { error: "Record not found" };
    const { data, links } = await buildData(res, fd, id ?? undefined);
    await beforeSave(res, data, existing);
    if (id) await updateRow(res.model, id, data);
    savedId = id ?? (await insertRow(res.model, data));
    // Many-to-many checkboxes (conditions, specialties, tags…) → join tables
    for (const [field, ids] of Object.entries(links)) if (LINKS[res.model]?.[field]) await setLinks(res.model, field, savedId, ids);
    const record = await findRow(res.model, savedId);
    await afterSave(res, record, existing);
    await contentChanged(res, [record]); // sitemap + search engines
  } catch (e: any) {
    // Friendly message for unique index errors (duplicate slug/email)
    if (isDuplicateKey(e)) return { error: "That value is already used by another record (must be unique)." };
    return { error: e instanceof Error ? (e.cause instanceof Error ? e.cause.message : e.message).split("\n").pop() : "Could not save" };
  }
  revalidatePath("/", "layout");
  if (!id) redirect(`/admin/r/${res.key}/${savedId}?created=1`);
  return { ok: true, message: `${res.singular} saved`, id: savedId };
}

export async function deleteRecord(resourceKey: string, id: number): Promise<AdminState> {
  await assertAdmin();
  const res = getResource(resourceKey);
  if (!res || res.canDelete === false) return { error: "Not allowed" };
  try {
    const record = await findRow(res.model, id);
    await deleteRows(res.model, [id]);
    await contentChanged(res, [record]);
  } catch (e: any) {
    // 1451 = a foreign key still points at this row
    const code = e?.errno ?? e?.cause?.errno;
    return { error: code === 1451 ? "This record is still used elsewhere and can't be deleted." : "Could not delete" };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: `${res.singular} deleted` };
}

export async function deleteMany(resourceKey: string, ids: number[]): Promise<AdminState> {
  await assertAdmin();
  const res = getResource(resourceKey);
  if (!res || res.canDelete === false) return { error: "Not allowed" };
  try {
    const records = await findRows(res.model, ids);
    await deleteRows(res.model, ids);
    await contentChanged(res, records);
  } catch {
    return { error: "Some records could not be deleted (still in use)." };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: `${ids.length} deleted` };
}

/** Quick actions from the list (Approve, Feature, Mark paid…) */
export async function setField(resourceKey: string, id: number, field: string, value: string | boolean): Promise<AdminState> {
  await assertAdmin();
  const res = getResource(resourceKey);
  if (!res || !res.quickActions?.some((q) => q.field === field && q.value === value)) return { error: "Not allowed" };
  const existing = await findRow(res.model, id);
  if (!existing) return { error: "Record not found" };
  await updateRow(res.model, id, { [field]: value });
  const record = await findRow(res.model, id);
  const data: Record<string, any> = { ...record };
  if (res.key === "posts" && field === "published" && value && !existing.publishedAt) await db.update(t.blogPosts).set({ publishedAt: new Date() }).where(eq(t.blogPosts.id, id));
  await afterSave(res, data, existing);
  await contentChanged(res, [record]);
  revalidatePath("/", "layout");
  return { ok: true, message: "Updated" };
}

// ─────────────────────────── Claims ───────────────────────────

export async function approveClaim(providerId: number): Promise<AdminState> {
  await assertAdmin();
  const provider = await db.query.providers.findFirst({ where: eq(t.providers.id, providerId), with: { user: true } });
  if (!provider || !provider.user) return { error: "No pending claim" };
  const free = await getFreePlan();
  await db
    .update(t.providers)
    .set({ claimStatus: "CLAIMED", claimedAt: new Date(), planId: provider.planId ?? free?.id ?? null, email: provider.email ?? provider.user.email })
    .where(eq(t.providers.id, providerId));
  await sendMail({
    to: provider.user.email,
    subject: "Your profile claim was approved",
    html: await emailLayout("You're verified!", `<p>Hi ${esc(provider.user.name)}, your claim for <b>${esc(providerName(provider))}</b> has been approved. You can now edit your profile.</p><p><a href="${siteUrl("/dashboard")}">Open your dashboard</a></p>`),
  });
  await onContentChanged([`/provider/${provider.slug}`]);
  revalidatePath("/", "layout");
  return { ok: true, message: "Claim approved" };
}

export async function rejectClaim(providerId: number): Promise<AdminState> {
  await assertAdmin();
  const provider = await db.query.providers.findFirst({ where: eq(t.providers.id, providerId), with: { user: true } });
  if (!provider) return { error: "Not found" };
  if (provider.user) {
    await db.update(t.users).set({ providerId: null }).where(eq(t.users.id, provider.user.id));
    await sendMail({
      to: provider.user.email,
      subject: "About your profile claim",
      html: await emailLayout("We couldn't verify your claim", `<p>Hi ${esc(provider.user.name)}, we were unable to verify ownership of <b>${esc(providerName(provider))}</b>. Please reply to this email with proof (e.g. license) and we'll take another look.</p>`),
    });
  }
  await db.update(t.providers).set({ claimStatus: "UNCLAIMED" }).where(eq(t.providers.id, providerId));
  revalidatePath("/", "layout");
  return { ok: true, message: "Claim rejected" };
}

// ─────────────────────────── Settings ───────────────────────────

/**
 * Save one settings group. Inputs are named "group.path.to.key",
 * e.g. "payments.stripe.secretKey". Types follow the defaults
 * (booleans from checkboxes, numbers from number inputs).
 */
export async function saveSettings(group: SettingsGroup, _: AdminState, fd: FormData): Promise<AdminState> {
  await assertAdmin();
  const current = (await getSettings())[group] as Record<string, any>;
  const defaults = DEFAULT_SETTINGS[group] as Record<string, any>;
  const next = structuredClone(current);

  const walk = (def: Record<string, any>, target: Record<string, any>, prefix: string) => {
    for (const [key, dv] of Object.entries(def)) {
      const name = `${prefix}.${key}`;
      if (dv && typeof dv === "object" && !Array.isArray(dv)) {
        target[key] ??= {};
        walk(dv, target[key], name);
      } else if (typeof dv === "boolean") {
        if (fd.has(`${name}__present`)) target[key] = fd.get(name) === "on";
      } else if (fd.has(name)) {
        const raw = String(fd.get(name) ?? "");
        // Secret fields are shown blank – keep the stored value unless a new one is typed
        if (fd.has(`${name}__secret`) && raw === "") continue;
        target[key] = typeof dv === "number" ? (key.endsWith("Cents") ? Math.round(Number(raw) * 100) : Number(raw)) : raw;
      }
    }
  };
  walk(defaults, next, group);
  await saveSettingsGroup(group, next);
  if (["general", "home", "claim", "products"].includes(group)) await onContentChanged([group === "claim" ? "/claim-your-profile" : group === "products" ? "/products" : "/"]);
  revalidatePath("/", "layout");
  return { ok: true, message: "Settings saved" };
}

// ─────────────────────────── Orders ───────────────────────────

export async function updateOrderStatus(orderId: number, status: string, notify: boolean): Promise<AdminState> {
  await assertAdmin();
  const allowed = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED", "REFUNDED", "FAILED"];
  if (!allowed.includes(status)) return { error: "Invalid status" };
  await db
    .update(t.orders)
    .set({ status: status as "PAID", ...(status === "PAID" ? { paidAt: new Date() } : {}) })
    .where(eq(t.orders.id, orderId));
  const order = await db.query.orders.findFirst({ where: eq(t.orders.id, orderId) });
  if (!order) return { error: "Order not found" };
  if (notify) {
    if (status === "PAID") await sendOrderEmails(order.id);
    else await sendMail({ to: order.email, subject: `Order ${order.orderNumber}: ${status.toLowerCase()}`, html: await emailLayout("Order update", `<p>Your order <b>${order.orderNumber}</b> is now <b>${status.toLowerCase()}</b>.</p>`) });
  }
  revalidatePath("/admin/orders");
  return { ok: true, message: "Order updated" };
}

/** Admin → Sitemap & Indexing → "Regenerate & notify now" */
export async function regenerateSitemapNow(): Promise<AdminState> {
  await assertAdmin();
  await onContentChanged(["/"]);
  return { ok: true, message: "Sitemap regenerated and search engines notified" };
}
