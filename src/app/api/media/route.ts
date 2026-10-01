/**
 * Media library API (WordPress-style).
 *   GET  /api/media?q=&type=image|video|pdf&page=   → list
 *   POST /api/media  (multipart: files[], target=gallery|profile) → upload
 *
 * Admins see / upload everything (stored in media/YYYY/MM).
 * Providers only see their own files (stored in providers/{id}/…).
 */
import { NextResponse, type NextRequest } from "next/server";
import { db, t, eq, and, or, like, desc } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { mediaFolder, providerFolder, saveUpload } from "@/lib/uploads";

const PAGE_SIZE = 40;

async function currentUploader() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role === "ADMIN") return { user, providerId: null as number | null };
  if (user.role === "PROVIDER" && user.providerId) return { user, providerId: user.providerId };
  return null;
}

export async function GET(request: NextRequest) {
  const who = await currentUploader();
  if (!who) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const type = sp.get("type");
  const q = sp.get("q")?.trim();

  const m = t.media;
  // undefined parts are ignored by and()
  const where = and(
    who.providerId ? eq(m.providerId, who.providerId) : undefined,
    type === "image" ? like(m.mimeType, "image/%") : type === "video" ? like(m.mimeType, "video/%") : type === "pdf" ? eq(m.mimeType, "application/pdf") : undefined,
    q ? or(like(m.originalName, `%${q}%`), like(m.alt, `%${q}%`), like(m.title, `%${q}%`)) : undefined,
  );
  const [total, items] = await Promise.all([
    db.$count(m, where),
    db.select().from(m).where(where).orderBy(desc(m.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
  ]);
  return NextResponse.json({ items, total, page, hasMore: page * PAGE_SIZE < total });
}

export async function POST(request: NextRequest) {
  const who = await currentUploader();
  if (!who) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  const target = form.get("target");

  // Provider uploads go to providers/{id}, providers/{id}/profile or providers/{id}/gallery
  const folder = who.providerId ? providerFolder(who.providerId, target === "profile" ? "profile" : target === "gallery" ? "gallery" : undefined) : mediaFolder();

  const saved = [];
  const errors: string[] = [];
  for (const file of files) {
    try {
      saved.push(await saveUpload(file, { folder, uploadedById: who.user.id, providerId: who.providerId ?? undefined }));
    } catch (e) {
      errors.push(`${file.name}: ${e instanceof Error ? e.message : "upload failed"}`);
    }
  }
  return NextResponse.json({ items: saved, errors }, { status: saved.length ? 200 : 400 });
}
