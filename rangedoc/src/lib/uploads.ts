/**
 * File uploads (media library + provider photos).
 * ------------------------------------------------------------------
 * Files are written to UPLOAD_DIR (default: storage/uploads) and served
 * by src/app/uploads/[...path]/route.ts at the URL /uploads/<path>.
 *
 * Folder layout:
 *   media/2026/09/…                     ← admin media library
 *   providers/{providerId}/profile/…    ← provider profile photo
 *   providers/{providerId}/gallery/…    ← provider gallery images
 *   providers/{providerId}/…            ← other provider files
 *
 * Raster images are converted to optimised WebP (max 2000px) with sharp.
 */
import "server-only";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import sharp from "sharp";
import { db, t, eq, insertId } from "@/lib/db";
import { slugify } from "@/lib/utils";

// turbopackIgnore: the folder is chosen at runtime, so don't bundle/trace it
export const UPLOAD_ROOT = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.UPLOAD_DIR || "storage/uploads");

/** Allowed types → max size in MB */
export const ALLOWED_TYPES: Record<string, number> = {
  "image/jpeg": 10,
  "image/png": 10,
  "image/webp": 10,
  "image/gif": 10,
  "image/svg+xml": 2,
  "image/x-icon": 1,
  "image/vnd.microsoft.icon": 1,
  "video/mp4": 200,
  "video/webm": 200,
  "video/quicktime": 200,
  "application/pdf": 25,
};

export function mediaFolder() {
  const d = new Date();
  return `media/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function providerFolder(providerId: number, sub?: "profile" | "gallery") {
  return sub ? `providers/${providerId}/${sub}` : `providers/${providerId}`;
}

/** Make sure a relative folder can't escape the upload root ("../../etc") */
function safeJoin(...parts: string[]) {
  const full = path.resolve(/*turbopackIgnore: true*/ UPLOAD_ROOT, ...parts);
  if (!full.startsWith(UPLOAD_ROOT)) throw new Error("Invalid path");
  return full;
}

export type SavedFile = Awaited<ReturnType<typeof saveUpload>>;

/**
 * Validate + store an uploaded File and create its `media` row (returns the row).
 */
export async function saveUpload(file: File, opts: { folder: string; uploadedById?: number; providerId?: number; alt?: string }) {
  const maxMb = ALLOWED_TYPES[file.type];
  if (!maxMb) throw new Error(`File type "${file.type || "unknown"}" is not allowed.`);
  if (file.size > maxMb * 1024 * 1024) throw new Error(`File is too large (max ${maxMb} MB).`);

  const original = file.name || "file";
  const ext = path.extname(original).toLowerCase();
  const base = slugify(path.basename(original, ext)) || "file";
  const unique = crypto.randomBytes(4).toString("hex");
  let buffer: Buffer = Buffer.from(await file.arrayBuffer());
  let mimeType = file.type;
  let filename = `${base}-${unique}${ext}`;
  let width: number | null = null;
  let height: number | null = null;

  // Optimise raster images → WebP (keeps GIF animation & SVG untouched)
  if (["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    const img = sharp(buffer, { failOn: "none" }).rotate();
    const out = await img.resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    buffer = out.data;
    width = out.info.width;
    height = out.info.height;
    mimeType = "image/webp";
    filename = `${base}-${unique}.webp`;
  }

  const dir = safeJoin(opts.folder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), buffer);

  const relPath = `${opts.folder}/${filename}`;
  const id = await insertId(
    db.insert(t.media).values({
      filename,
      originalName: original.slice(0, 190),
      url: `/uploads/${relPath}`,
      path: relPath,
      mimeType,
      size: buffer.length,
      width,
      height,
      alt: opts.alt ?? base.replace(/-/g, " "),
      title: base.replace(/-/g, " "),
      folder: opts.folder,
      uploadedById: opts.uploadedById,
      providerId: opts.providerId,
    }),
  );
  // MySQL can't return the inserted row, so read it back
  const row = await db.query.media.findFirst({ where: eq(t.media.id, id) });
  if (!row) throw new Error("Saved media row not found");
  return row;
}

/** Delete a media row and its file */
export async function deleteMedia(id: number) {
  const media = await db.query.media.findFirst({ where: eq(t.media.id, id) });
  if (!media) return;
  await fs.rm(safeJoin(media.path), { force: true }).catch(() => undefined);
  await db.delete(t.media).where(eq(t.media.id, id));
}

/** Resolve an /uploads URL path to a file on disk (used by the serving route) */
export function resolveUploadPath(segments: string[]) {
  return safeJoin(...segments);
}
