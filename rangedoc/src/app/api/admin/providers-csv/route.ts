/**
 * GET /api/admin/providers-csv?type=template  → sample CSV to fill in
 * GET /api/admin/providers-csv?type=export    → all providers as CSV
 * Admins only.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { exportCsv, templateCsv } from "@/lib/providers-csv";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const type = request.nextUrl.searchParams.get("type") === "export" ? "export" : "template";
  const csv = type === "export" ? await exportCsv() : templateCsv();
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type === "export" ? `providers-export-${date}` : "providers-import-template"}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
