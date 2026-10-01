"use client";
/**
 * Provider CSV import wizard (Admin → Import Providers).
 *  1. Choose / drop a .csv file
 *  2. Check – validates every row, nothing is saved yet
 *  3. Import – saves valid rows (rows with errors are skipped)
 */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, UploadCloud, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { previewProviderImport, runProviderImport } from "@/lib/admin/import-actions";
import type { AnalyzeResult, ImportOptions, ImportResult } from "@/lib/providers-csv";
import { Toggle } from "@/components/forms/FormKit";
import { cn } from "@/lib/utils";

export function ProviderImport() {
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [drag, setDrag] = useState(false);
  const [options, setOptions] = useState<ImportOptions>({ createMissingTaxonomy: true, createMissingCities: true, updateExisting: true });
  const [preview, setPreview] = useState<AnalyzeResult | null>(null);
  const [done, setDone] = useState<ImportResult | null>(null);
  const [pending, start] = useTransition();
  const [step, setStep] = useState<"idle" | "checking" | "importing">("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function pick(f: File | undefined) {
    if (!f) return;
    if (!/\.(csv|txt)$/i.test(f.name)) return toast.error("Please choose a .csv file (in Excel: File → Save As → CSV UTF-8).");
    setFile({ name: f.name, text: await f.text() });
    setPreview(null);
    setDone(null);
  }

  function check() {
    if (!file) return;
    setStep("checking");
    start(async () => {
      const res = await previewProviderImport(file.text, options);
      setStep("idle");
      if (!res.ok) return void toast.error(res.error);
      setPreview(res.result);
      setDone(null);
    });
  }

  function runImport() {
    if (!file) return;
    setStep("importing");
    start(async () => {
      const res = await runProviderImport(file.text, options);
      setStep("idle");
      if (!res.ok) return void toast.error(res.error);
      setDone(res.result);
      toast.success(`${res.result.created} created, ${res.result.updated} updated`);
      router.refresh();
    });
  }

  // Changing an option requires checking the file again
  const setOpt = (key: keyof ImportOptions) => (checked: boolean) => {
    setOptions((o) => ({ ...o, [key]: checked }));
    setPreview(null);
  };

  return (
    <div className="space-y-6">
      {/* Step 1 – file */}
      <div
        className={cn("card flex flex-col items-center gap-3 border-2 border-dashed p-8 text-center transition", drag ? "border-brand-500 bg-brand-50" : "border-line")}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pick(e.dataTransfer.files[0]);
        }}
      >
        <span className="icon-bubble size-14">{file ? <FileSpreadsheet className="size-7" /> : <UploadCloud className="size-7" />}</span>
        {file ? (
          <p className="font-semibold text-navy-900">
            {file.name} <span className="font-normal text-muted">· {(file.text.length / 1024).toFixed(0)} KB</span>
          </p>
        ) : (
          <p className="text-navy-800">Drag your CSV file here, or</p>
        )}
        <button type="button" className="btn-light" onClick={() => inputRef.current?.click()}>
          {file ? "Choose another file" : "Choose CSV file"}
        </button>
        <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      </div>

      {/* Step 2 – options */}
      <div className="card grid gap-4 p-5 md:grid-cols-3">
        <Toggle name="updateExisting" defaultChecked={options.updateExisting} onChange={setOpt("updateExisting")} label="Update existing providers" help="Matched by slug, then email. Empty cells never erase data." />
        <Toggle name="createMissingTaxonomy" defaultChecked={options.createMissingTaxonomy} onChange={setOpt("createMissingTaxonomy")} label="Create missing conditions, treatments & insurances" help="Otherwise unknown names are reported as errors." />
        <Toggle name="createMissingCities" defaultChecked={options.createMissingCities} onChange={setOpt("createMissingCities")} label="Create missing cities" help="Needs lat/lng in the row. Otherwise an error." />
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-light" disabled={!file || pending} onClick={check}>
          {step === "checking" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} 1. Check file
        </button>
        <button type="button" className="btn-primary" disabled={!preview || pending || preview.toCreate + preview.toUpdate === 0} onClick={runImport}>
          {step === "importing" ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
          2. Import {preview ? preview.toCreate + preview.toUpdate : ""} providers
        </button>
      </div>

      {/* Results */}
      {done && (
        <div className="card animate-pop-in border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <CheckCircle2 className="size-6 text-brand-600" /> Import finished
          </h2>
          <p className="mt-1 text-sm text-navy-800">
            <b>{done.created}</b> created · <b>{done.updated}</b> updated · <b>{done.failed.length}</b> failed · <b>{done.errors.length}</b> rows skipped because of errors. The sitemap was regenerated.
          </p>
          {done.failed.length > 0 && <IssueList title="Failed while saving" items={done.failed} tone="red" />}
        </div>
      )}

      {preview && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Rows", preview.totalRows],
              ["New providers", preview.toCreate],
              ["Updates", preview.toUpdate],
              ["Locations", preview.locations],
              ["Rows with errors", preview.errors.length],
            ].map(([label, n]) => (
              <div key={label as string} className={cn("card p-4", label === "Rows with errors" && Number(n) > 0 && "border-red-200 bg-red-50/50")}>
                <p className="text-sm text-muted">{label}</p>
                <p className="font-display text-2xl font-extrabold text-navy-900">{n}</p>
              </div>
            ))}
          </div>
          {preview.unknownColumns.length > 0 && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              Ignored unknown columns: <b>{preview.unknownColumns.join(", ")}</b>
            </p>
          )}
          {preview.errors.length > 0 && <IssueList title="Errors (these rows will be skipped)" items={preview.errors} tone="red" />}
          {preview.warnings.length > 0 && <IssueList title="Notes" items={preview.warnings} tone="amber" />}
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs text-muted uppercase">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Provider</th>
                  <th className="px-3 py-2">Slug</th>
                  <th className="px-3 py-2">City</th>
                  <th className="px-3 py-2 text-right">Locations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {preview.preview.map((p) => (
                  <tr key={p.row}>
                    <td className="px-3 py-2 text-muted">{p.row}</td>
                    <td className="px-3 py-2">
                      <span className={cn("badge", p.action === "create" ? "bg-brand-50 text-brand-800" : p.action === "update" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600")}>{p.action}</span>
                    </td>
                    <td className="px-3 py-2 font-medium text-navy-900">{p.name}</td>
                    <td className="px-3 py-2 font-mono text-xs">{p.slug}</td>
                    <td className="px-3 py-2">{p.city}</td>
                    <td className="px-3 py-2 text-right">{p.locations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.providers > preview.preview.length && <p className="p-3 text-xs text-muted">Showing the first {preview.preview.length} of {preview.providers} providers.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function IssueList({ title, items, tone }: { title: string; items: { row: number; message: string }[]; tone: "red" | "amber" }) {
  const Icon = tone === "red" ? XCircle : AlertTriangle;
  return (
    <div className={cn("rounded-xl border p-4", tone === "red" ? "border-red-200 bg-red-50/60" : "border-amber-200 bg-amber-50/60")}>
      <p className={cn("mb-2 flex items-center gap-2 font-semibold", tone === "red" ? "text-red-800" : "text-amber-900")}>
        <Icon className="size-4" /> {title} ({items.length})
      </p>
      <ul className="max-h-60 space-y-1 overflow-y-auto text-sm">
        {items.slice(0, 200).map((e, i) => (
          <li key={i} className="text-navy-800">
            <b>Row {e.row}:</b> {e.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
