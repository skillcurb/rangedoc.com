"use client";
/**
 * Form helpers for dashboards.
 *  <ActionForm action={serverAction}>  – shows toast on success / error
 *  <ActionButton run={() => action(id)} confirm="…"> – one-click actions
 *  <CheckboxGroup> – searchable multi-select (conditions, insurances…)
 *  <Toggle> – on/off switch that posts as a checkbox
 */
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

type State = { ok?: boolean; error?: string; message?: string } | null;

export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
  onSuccess,
}: {
  action: (state: State, fd: FormData) => Promise<State>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  onSuccess?: () => void;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Saved");
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.();
      router.refresh();
    } else if (state.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
    </form>
  );
}

export function ActionButton({ run, children, className, confirm: confirmText, title }: { run: () => Promise<State | void>; children: React.ReactNode; className?: string; confirm?: string; title?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      title={title}
      disabled={pending}
      className={className}
      onClick={() => {
        if (confirmText && !window.confirm(confirmText)) return;
        start(async () => {
          const res = await run();
          if (res && res.error) toast.error(res.error);
          else if (res && res.message) toast.success(res.message);
          router.refresh();
        });
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : children}
    </button>
  );
}

export function CheckboxGroup({ name, options, selected, columns = 3 }: { name: string; options: { id: number; name: string }[]; selected: number[]; columns?: number }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<number[]>(selected);
  const list = options.filter((o) => o.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="rounded-lg border border-line">
      <div className="flex items-center gap-2 border-b border-line p-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" className="input py-1.5 text-sm" />
        <span className="shrink-0 text-xs text-muted">{sel.length} selected</span>
      </div>
      <div className={cn("grid max-h-60 gap-1.5 overflow-y-auto p-3", columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3")}>
        {/* Hidden inputs keep selections that are filtered out of view */}
        {sel.filter((id) => !list.some((o) => o.id === id)).map((id) => <input key={id} type="hidden" name={name} value={id} />)}
        {list.map((o) => (
          <label key={o.id} className="flex cursor-pointer items-center gap-2 text-sm text-navy-800">
            <input
              type="checkbox"
              name={name}
              value={o.id}
              checked={sel.includes(o.id)}
              onChange={(e) => setSel(e.target.checked ? [...sel, o.id] : sel.filter((x) => x !== o.id))}
              className="checkbox"
            />
            {o.name}
          </label>
        ))}
      </div>
    </div>
  );
}

export function Toggle({ name, defaultChecked, label, help }: { name: string; defaultChecked?: boolean; label: string; help?: string }) {
  const [on, setOn] = useState(!!defaultChecked);
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" name={name} checked={on} onChange={(e) => setOn(e.target.checked)} className="peer sr-only" />
      <span className={cn("mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition", on ? "bg-brand-600" : "bg-navy-200")}>
        <span className={cn("size-5 rounded-full bg-white shadow transition", on && "translate-x-5")} />
      </span>
      <span>
        <span className="block text-sm font-medium text-navy-900">{label}</span>
        {help && <span className="block text-xs text-muted">{help}</span>}
      </span>
    </label>
  );
}
