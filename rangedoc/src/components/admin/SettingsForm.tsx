"use client";
/**
 * Settings form: inputs are named "group.path" and saved as one JSON
 * group by saveSettings(). Secret fields are never pre-filled.
 */
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { saveSettings, type AdminState } from "@/lib/admin/actions";
import type { SettingsGroup } from "@/lib/settings";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Toggle } from "@/components/forms/FormKit";
import { MediaField } from "@/components/media/MediaLibrary";

export type SettingField = { path: string; label: string; type: "text" | "textarea" | "number" | "money" | "boolean" | "image" | "secret" | "select"; options?: string[] };

const get = (obj: Record<string, unknown>, path: string) => path.split(".").reduce<unknown>((a, k) => (a && typeof a === "object" ? (a as Record<string, unknown>)[k] : undefined), obj);

export function SettingsForm({ group, fields, values }: { group: SettingsGroup; fields: SettingField[]; values: Record<string, unknown> }) {
  const [state, action] = useActionState<AdminState, FormData>(saveSettings.bind(null, group), null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Saved");
      router.refresh();
    } else if (state?.error) toast.error(state.error);
  }, [state, router]);

  return (
    <form action={action} className="mt-6 grid gap-5 sm:grid-cols-2">
      {fields.map((f) => {
        const name = `${group}.${f.path}`;
        const v = get(values, f.path);
        const wide = f.type === "textarea" || f.type === "image";
        if (f.type === "boolean") {
          return (
            <div key={f.path} className="sm:col-span-2">
              <input type="hidden" name={`${name}__present`} value="1" />
              <Toggle name={name} defaultChecked={!!v} label={f.label} />
            </div>
          );
        }
        if (f.type === "image") {
          return (
            <div key={f.path} className="sm:col-span-2">
              <MediaField name={name} defaultValue={String(v ?? "")} label={f.label} />
            </div>
          );
        }
        return (
          <label key={f.path} className={wide ? "sm:col-span-2" : ""}>
            <span className="label">{f.label}</span>
            {f.type === "textarea" ? (
              <textarea name={name} defaultValue={String(v ?? "")} rows={3} className="input" />
            ) : f.type === "select" ? (
              <select name={name} defaultValue={String(v ?? "")} className="input">
                {f.options?.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : f.type === "secret" ? (
              <>
                <input type="hidden" name={`${name}__secret`} value="1" />
                <input name={name} type="password" autoComplete="off" placeholder={v ? "•••••••• (saved – type to replace)" : "Not set"} className="input" />
              </>
            ) : (
              <input
                name={name}
                type={f.type === "number" || f.type === "money" ? "number" : "text"}
                step={f.type === "money" ? "0.01" : "any"}
                defaultValue={f.type === "money" ? ((Number(v) || 0) / 100).toFixed(2) : String(v ?? "")}
                className="input"
              />
            )}
          </label>
        );
      })}
      <div className="sm:col-span-2">
        <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
      </div>
    </form>
  );
}
