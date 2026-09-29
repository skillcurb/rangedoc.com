/**
 * ADMIN – generic create / edit page ( /admin/r/{resource}/{id|new} )
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getResource } from "@/lib/admin/resources";
import { getRecord, relationOptions } from "@/lib/admin/data";
import { PageHeader } from "@/components/panel/PanelUi";
import { ResourceForm } from "@/components/admin/ResourceForm";

type Props = { params: Promise<{ resource: string; id: string }> };

export async function generateMetadata({ params }: Props) {
  const { resource, id } = await params;
  const res = getResource(resource);
  return { title: res ? `${id === "new" ? "New" : "Edit"} ${res.singular}` : "Admin" };
}

export default async function ResourceEditPage({ params }: Props) {
  const { resource, id } = await params;
  const res = getResource(resource);
  if (!res) notFound();
  const isNew = id === "new";
  if (isNew && res.canCreate === false) notFound();
  const record = isNew ? {} : await getRecord(res, Number(id));
  if (!record) notFound();
  const options = await relationOptions(res.fields);
  const values = { ...record } as Record<string, unknown>;
  delete values.passwordHash; // never send password hashes to the browser
  delete values.resetToken;
  const viewUrl = !isNew && res.viewPath ? res.viewPath.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? "")) : null;

  return (
    <div>
      <Link href={`/admin/r/${res.key}`} className="mb-3 inline-flex items-center gap-1 text-sm text-navy-700 hover:text-brand-700">
        <ArrowLeft className="size-4" /> {res.label}
      </Link>
      <PageHeader
        title={isNew ? `Add ${res.singular.toLowerCase()}` : `Edit ${res.singular.toLowerCase()}`}
        subtitle={res.description}
        actions={
          viewUrl && (
            <a href={viewUrl} target="_blank" className="btn-light">
              <ExternalLink className="size-4" /> View on site
            </a>
          )
        }
      />
      <ResourceForm key={id} resource={res} id={isNew ? null : Number(id)} values={values} options={options} />
    </div>
  );
}
