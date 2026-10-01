"use client";
/**
 * Reusable autocomplete input.
 * Fetches suggestions from /api/suggest?kind=…&q=… as the user types
 * (debounced), supports keyboard navigation (↑ ↓ Enter Esc).
 */
import { useEffect, useId, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type Suggestion = { type: string; label: string; sub?: string | null; slug?: string; lat?: number; lng?: number; id?: number };

type Props = {
  kind: "condition" | "location" | "provider";
  value: string;
  onChange: (value: string) => void;
  onSelect: (s: Suggestion) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  inputClassName?: string;
  /** Extra options shown at the top of the list (e.g. "Use my current location") */
  extra?: React.ReactNode;
  showOnFocus?: boolean;
  name?: string;
  ariaLabel?: string;
};

export function Autocomplete({ kind, value, onChange, onSelect, placeholder, icon, className, inputClassName, extra, showOnFocus = true, name, ariaLabel }: Props) {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Debounced fetch whenever the text changes while open
  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/suggest?kind=${kind}&q=${encodeURIComponent(value)}`, { signal: ctrl.signal });
        setItems(await res.json());
        setActive(-1);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value, open, kind]);

  // Close when clicking outside
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function choose(s: Suggestion) {
    onSelect(s);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      choose(items[active]);
    } else if (e.key === "Escape") setOpen(false);
  }

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      {icon && <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-navy-700">{icon}</span>}
      <input
        name={name}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => showOnFocus && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        autoComplete="off"
        className={cn("input h-12", icon && "pl-10", value && "pr-9", inputClassName)}
      />
      {value && (
        <button type="button" onClick={() => onChange("")} className="absolute top-1/2 right-3 -translate-y-1/2 text-muted hover:text-navy-900" aria-label="Clear">
          <X className="size-4" />
        </button>
      )}
      {open && (items.length > 0 || extra || loading) && (
        <div id={listId} role="listbox" className="absolute top-full right-0 left-0 z-40 mt-1 max-h-80 overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-pop">
          {extra && <div onClick={() => setOpen(false)}>{extra}</div>}
          {loading && !items.length && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" /> Searching…
            </div>
          )}
          {items.map((s, i) => (
            <button
              type="button"
              key={`${s.type}-${s.slug ?? s.id}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(s)}
              className={cn("flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-brand-50", i === active && "bg-brand-50")}
            >
              <span className="font-medium text-navy-900">{s.label}</span>
              {s.sub && <span className="shrink-0 text-xs text-muted">{s.sub}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
