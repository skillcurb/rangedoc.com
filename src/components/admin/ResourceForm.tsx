"use client";
/**
 * Generic admin edit form – renders any resource from its field definitions.
 * Layout: main fields (left), side fields (right), SEO box (bottom).
 */
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { FieldDef, ResourceDef } from "@/lib/admin/resources";
import { saveRecord, type AdminState } from "@/lib/admin/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { MediaField, MediaMultiField } from "@/components/media/MediaLibrary";
import { RichTextEditor } from "@/components/forms/RichTextEditor";
import { CheckboxGroup, Toggle } from "@/components/forms/FormKit";
import { LocationPickerLazy } from "@/components/site/map";
import { ICON_NAMES, Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type Options = Record<string, { value: number; label: string }[]>;
type Values = Record<string, unknown>;

function toInputDate(v: unknown, withTime: boolean) {
  if (!v) return "";
  const d = new Date(v as string);
  if (Number.isNaN(d.getTime())) return "";
  if (!withTime) return d.toISOString().slice(0, 10);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function LatLngField({ lat, lng }: { lat?: number | null; lng?: number | null }) {
  const [p, setP] = useState<{ lat?: number; lng?: number }>({ lat: lat ?? undefined, lng: lng ?? undefined });
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <input name="lat" type="number" step="any" value={p.lat ?? ""} onChange={(e) => setP({ ...p, lat: Number(e.target.value) })} className="input" placeholder="Latitude" required />
        <input name="lng" type="number" step="any" value={p.lng ?? ""} onChange={(e) => setP({ ...p, lng: Number(e.target.value) })} className="input" placeholder="Longitude" required />
      </div>
      <div className="h-72 overflow-hidden rounded-lg border border-line">
        <LocationPickerLazy lat={p.lat} lng={p.lng} onPick={(a, b) => setP({ lat: a, lng: b })} />
      </div>
    </div>
  );
}

function IconPicker({ name, value }: { name: string; value?: string }) {
  const [v, setV] = useState(value ?? "");
  return (
    <div>
      <input type="hidden" name={name} value={v} />
      <div className="grid max-h-48 grid-cols-6 gap-1.5 overflow-y-auto rounded-lg border border-line p-2">
        {ICON_NAMES.map((n) => (
          <button key={n} type="button" title={n} onClick={() => setV(n)} className={cn("grid aspect-square place-items-center rounded-md border", v === n ? "border-brand-600 bg-brand-50 text-brand-700" : "border-transparent hover:bg-surface")}>
            <Icon name={n} className="size-5" />
          </button>
        ))}
      </div>
      <p className="help">{v || "No icon selected"}</p>
    </div>
  );
}

function FieldInput({ f, value, options }: { f: FieldDef; value: unknown; options: Options }) {
  const dv = value ?? f.defaultValue;
  const common = { name: f.name, id: `f-${f.name}`, required: f.required, readOnly: f.readOnly, placeholder: f.placeholder };
  switch (f.type) {
    case "textarea":
      return <textarea {...common} defaultValue={(dv as string) ?? ""} rows={f.wide ? 5 : 3} className={cn("input", f.readOnly && "bg-surface")} />;
    case "richtext":
      return <RichTextEditor name={f.name} defaultValue={(dv as string) ?? ""} />;
    case "number":
      return <input {...common} type="number" step="any" defaultValue={dv == null ? "" : String(dv)} className="input" />;
    case "money":
      return (
        <div className="relative">
          <span className="absolute top-1/2 left-3 -translate-y-1/2 text-muted">$</span>
          <input {...common} type="number" step="0.01" min="0" defaultValue={dv == null ? "" : ((dv as number) / 100).toFixed(2)} className="input pl-7" />
        </div>
      );
    case "boolean":
      return <Toggle name={f.name} defaultChecked={!!dv} label={f.label} help={f.help} />;
    case "select":
      return (
        <select {...common} defaultValue={(dv as string) ?? ""} className="input" disabled={f.readOnly}>
          <option value="">— Select —</option>
          {f.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "relation":
      return (
        <select {...common} defaultValue={dv == null ? "" : String(dv)} className="input">
          <option value="">— None —</option>
          {options[f.name]?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "relationMany": {
      const selected = Array.isArray(dv) ? (dv as { id: number }[]).map((x) => x.id) : [];
      return <CheckboxGroup name={f.name} options={(options[f.name] ?? []).map((o) => ({ id: o.value, name: o.label }))} selected={selected} columns={f.group === "side" ? 2 : 3} />;
    }
    case "image":
    case "file":
      return <MediaField name={f.name} defaultValue={(dv as string) ?? ""} accept={f.accept ?? (f.type === "image" ? "image" : "all")} />;
    case "images":
      return <MediaMultiField name={f.name} defaultValue={Array.isArray(dv) ? (dv as string[]) : []} />;
    case "list":
      return <textarea {...common} defaultValue={Array.isArray(dv) ? (dv as string[]).join("\n") : ""} rows={6} className="input font-mono text-xs" />;
    case "json":
      return <textarea {...common} defaultValue={dv ? JSON.stringify(dv, null, 2) : "[]"} rows={6} className="input font-mono text-xs" />;
    case "date":
    case "datetime":
      return <input {...common} type={f.type === "date" ? "date" : "datetime-local"} defaultValue={toInputDate(dv, f.type === "datetime")} className={cn("input", f.readOnly && "bg-surface")} />;
    case "icon":
      return <IconPicker name={f.name} value={dv as string} />;
    case "password":
      return <input {...common} type="password" autoComplete="new-password" className="input" />;
    case "email":
      return <input {...common} type="email" defaultValue={(dv as string) ?? ""} className={cn("input", f.readOnly && "bg-surface")} />;
    case "url":
      return <input {...common} type="text" inputMode="url" defaultValue={(dv as string) ?? ""} className="input" />;
    case "slug":
      return <input {...common} defaultValue={(dv as string) ?? ""} className="input font-mono text-sm" placeholder="auto-generated from the title" />;
    default:
      return <input {...common} defaultValue={(dv as string) ?? ""} className={cn("input", f.readOnly && "bg-surface")} />;
  }
}

function FieldBlock({ f, values, options }: { f: FieldDef; values: Values; options: Options }) {
  if (f.type === "latlng") {
    return (
      <div className="sm:col-span-2">
        <span className="label">{f.label}</span>
        <LatLngField lat={values.lat as number} lng={values.lng as number} />
        {f.help && <p className="help">{f.help}</p>}
      </div>
    );
  }
  if (f.type === "boolean") return <div className={cn(f.wide && "sm:col-span-2")}><FieldInput f={f} value={values[f.name]} options={options} /></div>;
  return (
    <div className={cn(f.wide && "sm:col-span-2")}>
      <label className="label" htmlFor={`f-${f.name}`}>
        {f.label} {f.required && <span className="text-red-500">*</span>}
      </label>
      <FieldInput f={f} value={values[f.name]} options={options} />
      {f.help && <p className="help">{f.help}</p>}
    </div>
  );
}

export function ResourceForm({ resource, id, values, options }: { resource: ResourceDef; id: number | null; values: Values; options: Options }) {
  const action = saveRecord.bind(null, resource.key, id);
  const [state, formAction] = useActionState<AdminState, FormData>(action, null);
  const router = useRouter();
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Saved");
      router.refresh();
    } else if (state.error) toast.error(state.error);
  }, [state, router]);

  const main = resource.fields.filter((f) => !f.group || f.group === "main");
  const side = resource.fields.filter((f) => f.group === "side");
  const seo = resource.fields.filter((f) => f.group === "seo");

  return (
    <form action={formAction} className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          {main.map((f) => (
            <FieldBlock key={f.name} f={f} values={values} options={options} />
          ))}
        </section>
        {seo.length > 0 && (
          <section className="card p-5">
            <h2 className="mb-1 text-lg font-bold">SEO &amp; social sharing</h2>
            <p className="mb-4 text-sm text-muted">Leave empty to use automatic values.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {seo.map((f) => (
                <FieldBlock key={f.name} f={{ ...f, wide: f.type !== "image" }} values={values} options={options} />
              ))}
            </div>
          </section>
        )}
        <div className="flex justify-end">
          <SubmitButton pendingText="Saving…">{id ? "Save changes" : `Create ${resource.singular.toLowerCase()}`}</SubmitButton>
        </div>
      </div>
      <aside className="space-y-4">
        <div className="card space-y-4 p-5">
          <SubmitButton className="w-full" pendingText="Saving…">
            {id ? "Save changes" : `Create ${resource.singular.toLowerCase()}`}
          </SubmitButton>
          {side.map((f) => (
            <FieldBlock key={f.name} f={f} values={values} options={options} />
          ))}
        </div>
      </aside>
    </form>
  );
}
