/**
 * GET /uploads/<path> – serves files from UPLOAD_DIR.
 * (Next.js only serves /public files that existed at build time, so user
 * uploads are streamed from disk here with long cache headers.)
 */
import fs from "node:fs/promises";
import path from "node:path";
import { resolveUploadPath } from "@/lib/uploads";

const TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".pdf": "application/pdf",
};

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  try {
    const file = resolveUploadPath(segments.map(decodeURIComponent));
    const data = await fs.readFile(file);
    const ext = path.extname(file).toLowerCase();
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        // SVGs could contain scripts – never let them run
        ...(ext === ".svg" ? { "Content-Security-Policy": "script-src 'none'" } : {}),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
