/**
 * Small helpers shared by server and client code.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, resolving conflicts (e.g. "px-2 px-4" → "px-4"). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "Back & Spine Pain!" → "back-spine-pain" */
export function slugify(input: string) {
  return input
    .toString()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

/** 2999 → "$29.99" */
export function formatMoney(cents: number | null | undefined, currency = "USD") {
  const value = (cents ?? 0) / 100;
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: value % 1 === 0 ? 0 : 2 }).format(value);
}

export function formatDate(date: Date | string | null | undefined, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", opts).format(new Date(date));
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

/** Initials for avatar fallbacks: "Jamie Smith" → "JS" */
export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Provider display name: "Dr. Sarah Kim, DPT" */
export function providerName(p: { prefix?: string | null; firstName: string; lastName: string; credentials?: string | null }) {
  const base = [p.prefix, p.firstName, p.lastName].filter(Boolean).join(" ");
  return p.credentials ? `${base}, ${p.credentials}` : base;
}

export const PROVIDER_TYPE_LABEL: Record<string, string> = {
  PHYSICAL_THERAPIST: "Physical Therapist",
  CHIROPRACTOR: "Chiropractor",
};

/** URL-friendly short codes for provider type */
export const TYPE_PARAM_TO_ENUM: Record<string, "PHYSICAL_THERAPIST" | "CHIROPRACTOR"> = {
  pt: "PHYSICAL_THERAPIST",
  chiro: "CHIROPRACTOR",
};
export const TYPE_ENUM_TO_PARAM: Record<string, string> = {
  PHYSICAL_THERAPIST: "pt",
  CHIROPRACTOR: "chiro",
};

/** Absolute site URL (for canonical tags, emails, payment return URLs) */
export function siteUrl(path = "") {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Random, human-friendly order number, e.g. "RD-7K3F9Q2A" */
export function orderNumber(prefix = "RD") {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${s}`;
}

/** Split "a, b ,c" into ["a","b","c"] */
export function splitList(value: string | null | undefined) {
  return (value ?? "")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Safely read a JSON string[] column */
export function jsonStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return [];
}

export function truncate(s: string | null | undefined, n: number) {
  if (!s) return "";
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
}

/** Remove HTML tags (for excerpts / meta descriptions from rich text) */
export function stripHtml(html: string | null | undefined) {
  return (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
