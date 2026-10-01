/**
 * ADMIN – IMPORT / EXPORT PROVIDERS ( /admin/import )
 * Bulk-add or update doctors from a CSV file (Excel / Google Sheets →
 * "CSV UTF-8"). Includes the downloadable template and the column guide.
 */
import { Download, FileDown } from "lucide-react";
import { db, t, eq, asc } from "@/lib/db";
import { PROVIDER_CSV_COLUMNS } from "@/lib/providers-csv-columns";
import { PageHeader, Panel } from "@/components/panel/PanelUi";
import { ProviderImport } from "@/components/admin/ProviderImport";

export const metadata = { title: "Import Providers" };

export default async function ImportPage() {
  const [providers, cities, plans] = await Promise.all([
    db.$count(t.providers),
    db.select({ name: t.cities.name, stateCode: t.cities.stateCode }).from(t.cities).where(eq(t.cities.active, true)).orderBy(asc(t.cities.name)),
    db.select({ slug: t.plans.slug, name: t.plans.name }).from(t.plans).where(eq(t.plans.active, true)).orderBy(asc(t.plans.sortOrder)),
  ]);
  const groups = [...new Set(PROVIDER_CSV_COLUMNS.map((c) => c.group))];
  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Providers (CSV)"
        subtitle={`Add or update many doctors at once. ${providers} providers in the directory now.`}
        actions={
          <>
            <a href="/api/admin/providers-csv?type=template" className="btn-light">
              <Download className="size-4" /> Download template
            </a>
            <a href="/api/admin/providers-csv?type=export" className="btn-light">
              <FileDown className="size-4" /> Export all providers
            </a>
          </>
        }
      />

      <ProviderImport />

      <Panel title="How it works">
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-navy-800">
          <li>Download the template, fill it in with Excel or Google Sheets (one row per doctor), and save as <b>CSV UTF-8</b>.</li>
          <li>
            Lists (conditions, treatments, insurance, languages, gallery) use a vertical bar: <code className="rounded bg-surface px-1">Back Pain|Neck Pain</code>.
          </li>
          <li>
            A doctor with several locations: give them a <b>slug</b> and add one extra row per location with the same slug (only the location columns are needed on extra rows).
          </li>
          <li>To update doctors in bulk: export all providers, edit the file, and import it again. Rows are matched by slug (or email); empty cells keep the current value.</li>
          <li>Click <b>Check file</b> first – nothing is saved until you click <b>Import</b>. Rows with errors are skipped and listed with their row number.</li>
          <li>After importing, the sitemap is regenerated and search engines are notified automatically.</li>
        </ol>
        <p className="mt-3 text-xs text-muted">
          Cities available now: {cities.map((c) => `${c.name} ${c.stateCode}`).join(", ")}. Plans: {plans.map((p) => `${p.slug} (${p.name})`).join(", ")}.
        </p>
      </Panel>

      <Panel title="Column guide">
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g}>
              <h3 className="mb-2 text-sm font-bold tracking-wide text-brand-700 uppercase">{g}</h3>
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full text-sm">
                  <thead className="bg-surface text-left text-xs text-muted uppercase">
                    <tr>
                      <th className="w-44 px-3 py-2">Column</th>
                      <th className="px-3 py-2">What to enter</th>
                      <th className="w-64 px-3 py-2">Example</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {PROVIDER_CSV_COLUMNS.filter((c) => c.group === g).map((c) => (
                      <tr key={c.key} className="align-top">
                        <td className="px-3 py-2 font-mono text-xs font-semibold text-navy-900">
                          {c.key}
                          {c.required && <span className="ml-1 text-red-500" title="Required for new providers">*</span>}
                        </td>
                        <td className="px-3 py-2 text-navy-700">{c.help || c.label}</td>
                        <td className="px-3 py-2 font-mono text-xs break-all text-muted">{c.example}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted">* Required when creating a new provider.</p>
        </div>
      </Panel>
    </div>
  );
}
