/**
 * ADMIN – generic list page for any resource ( /admin/r/{resource} )
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { getResource } from "@/lib/admin/resources";
import { listRecords, readPath } from "@/lib/admin/data";
import { PageHeader } from "@/components/panel/PanelUi";
import { ResourceTable } from "@/components/admin/ResourceTable";

type Props = { params: Promise<{ resource: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props) {
  return { title: getResource((await params).resource)?.label ?? "Admin" };
}

export default async function ResourceListPage({ params, searchParams }: Props) {
  const res = getResource((await params).resource);
  if (!res) notFound();
  const sp = await searchParams;
  const { rows, total, page, pages } = await listRecords(res, { q: sp.q, page: Number(sp.page) || 1, filters: sp as Record<string, string> });
  // Only send the columns the table needs to the browser
  const tableRows = rows.map((r) => ({
    id: r.id as number,
    __cells: res.columns.map((c) => {
      const v = readPath(r, c.field);
      return v instanceof Date ? v.toISOString() : v;
    }),
    __view: res.viewPath ? res.viewPath.replace(/\{(\w+)\}/g, (_, k) => String(r[k] ?? "")) : null,
  }));
  return (
    <div>
      <PageHeader
        title={res.label}
        subtitle={res.description}
        actions={
          res.canCreate !== false && (
            <Link href={`/admin/r/${res.key}/new`} className="btn-primary">
              <Plus className="size-4" /> Add {res.singular.toLowerCase()}
            </Link>
          )
        }
      />
      <ResourceTable resource={res} rows={tableRows} total={total} page={page} pages={pages} />
    </div>
  );
}
