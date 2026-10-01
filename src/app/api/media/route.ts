/**
 * Media library API (WordPress-style).
 *   GET  /api/media?q=&type=image|video|pdf&page=   → list
 *   POST /api/media  (multipart: files[], target=gallery|profile) → upload
 *
 * Admins see / upload everything (stored in media/YYYY/MM).
 * Providers only see their own files (stored in providers/{id}/…).
 */
import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
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

  const where: Prisma.MediaWhereInput = {
    ...(who.providerId ? { providerId: who.providerId } : {}),
    ...(type === "image" ? { mimeType: { startsWith: "image/" } } : type === "video" ? { mimeType: { startsWith: "video/" } } : type === "pdf" ? { mimeType: "application/pdf" } : {}),
    ...(q ? { OR: [{ originalName: { contains: q } }, { alt: { contains: q } }, { title: { contains: q } }] } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.media.count({ where }),
    prisma.media.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
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
