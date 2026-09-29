"use server";
/**
 * Admin server actions for the provider CSV import.
 *  - previewProviderImport: validate only (nothing is saved)
 *  - runProviderImport:     save to the database, then rebuild the
 *                           sitemap and notify search engines
 */
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { analyzeCsv, importCsv, type ImportOptions } from "@/lib/providers-csv";
import { onContentChanged } from "@/lib/sitemap";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB ≈ 50,000+ providers

function check(csv: string) {
  if (!csv.trim()) throw new Error("The file is empty.");
  if (csv.length > MAX_BYTES) throw new Error("The file is larger than 15 MB – split it into smaller files.");
}

export async function previewProviderImport(csv: string, options: ImportOptions) {
  await assertAdmin();
  try {
    check(csv);
    return { ok: true as const, result: await analyzeCsv(csv, options) };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function runProviderImport(csv: string, options: ImportOptions) {
  await assertAdmin();
  try {
    check(csv);
    const result = await importCsv(csv, options);
    if (result.paths.length) {
      // New/updated profiles → sitemap + IndexNow (Bing etc.)
      await onContentChanged(["/providers", ...result.paths.slice(0, 9000)]);
      revalidatePath("/", "layout");
    }
    return { ok: true as const, result };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}
