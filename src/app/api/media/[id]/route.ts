/**
 * PATCH  /api/media/{id}  { alt, title } → update details
 * DELETE /api/media/{id}                 → delete file + record
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { deleteMedia } from "@/lib/uploads";

async function canEdit(id: number) {
  const user = await getCurrentUser();
  const media = await prisma.media.findUnique({ where: { id } });
  if (!user || !media) return null;
  if (user.role === "ADMIN") return media;
  if (user.role === "PROVIDER" && media.providerId === user.providerId) return media;
  return null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!(await canEdit(id))) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const body = z.object({ alt: z.string().max(190).optional(), title: z.string().max(190).optional() }).parse(await request.json());
  const media = await prisma.media.update({ where: { id }, data: body });
  return NextResponse.json(media);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const media = await canEdit(id);
  if (!media) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  // Also remove gallery rows that point at this file
  await prisma.galleryImage.deleteMany({ where: { url: media.url } });
  await deleteMedia(id);
  return NextResponse.json({ ok: true });
}
