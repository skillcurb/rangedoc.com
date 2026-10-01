"use client";
/**
 * WordPress-style Media Library.
 * ------------------------------------------------------------------
 *  <MediaLibrary>      full grid: upload (drag & drop), search, filter,
 *                      details panel (alt text, copy URL, delete)
 *  <MediaPickerModal>  the same library in a popup with a "Select" button
 *  <MediaField>        form field: preview + "Choose from library" button;
 *                      writes the chosen URL into a hidden input (name=…)
 *  <MediaMultiField>   same, for a list of URLs (product gallery)
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, Copy, FileText, Film, ImagePlus, Loader2, Search, Trash2, UploadCloud, X } from "lucide-react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { cn, formatDate } from "@/lib/utils";

export type MediaItem = {
  id: number;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  title: string | null;
  createdAt: string;
};

type Accept = "image" | "video" | "pdf" | "all";

const ACCEPT_ATTR: Record<Accept, string> = {
  image: "image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/x-icon",
  video: "video/mp4,video/webm,video/quicktime",
  pdf: "application/pdf",
  all: "image/*,video/mp4,video/webm,video/quicktime,application/pdf",
};

function Thumb({ m, className }: { m: MediaItem; className?: string }) {
  if (m.mimeType.startsWith("image/")) {
    return <Image src={m.url} alt={m.alt || m.originalName} fill sizes="160px" className={cn("object-cover", className)} unoptimized={m.mimeType === "image/svg+xml"} />;
  }
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-surface p-2 text-center text-[10px] text-muted">
      {m.mimeType.startsWith("video/") ? <Film className="size-8 text-navy-400" /> : <FileText className="size-8 text-red-400" />}
      <span className="line-clamp-2 break-all">{m.originalName}</span>
    </div>
  );
}

export function MediaLibrary({
  accept = "all",
  multiple = false,
  onSelect,
  target,
  selectLabel = "Select",
}: {
  accept?: Accept;
  multiple?: boolean;
  onSelect?: (items: MediaItem[]) => void;
  /** Provider uploads only: "gallery" | "profile" sub-folder */
  target?: "gallery" | "profile";
  selectLabel?: string;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [q, setQ] = useState("");
  const [type, setType] = useState<Accept>(accept);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState<MediaItem[]>([]);
  const [active, setActive] = useState<MediaItem | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(
    async (p = 1) => {
      setLoading(true);
      const res = await fetch(`/api/media?page=${p}&q=${encodeURIComponent(q)}&type=${type === "all" ? "" : type}`);
      const data = await res.json();
      setItems((cur) => (p === 1 ? data.items : [...cur, ...data.items]));
      setHasMore(data.hasMore);
      setPage(p);
      setLoading(false);
    },
    [q, type],
  );

  useEffect(() => {
    const t = setTimeout(() => load(1), 250);
    return () => clearTimeout(t);
  }, [load]);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setUploading(true);
    const fd = new FormData();
    list.forEach((f) => fd.append("files", f));
    if (target) fd.append("target", target);
    const res = await fetch("/api/media", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    (data.errors ?? []).forEach((e: string) => toast.error(e));
    if (data.items?.length) {
      toast.success(`${data.items.length} file(s) uploaded`);
      setItems((cur) => [...data.items, ...cur]);
      // Auto-select what was just uploaded
      setSelected(multiple ? [...data.items, ...selected] : [data.items[0]]);
      setActive(data.items[0]);
    }
  }

  function toggle(m: MediaItem) {
    setActive(m);
    if (!onSelect) return;
    if (multiple) setSelected((cur) => (cur.some((x) => x.id === m.id) ? cur.filter((x) => x.id !== m.id) : [...cur, m]));
    else setSelected([m]);
  }

  async function saveDetails(m: MediaItem, data: { alt?: string; title?: string }) {
    const res = await fetch(`/api/media/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) {
      const updated = await res.json();
      setItems((cur) => cur.map((x) => (x.id === m.id ? { ...x, ...updated } : x)));
      setActive((a) => (a && a.id === m.id ? { ...a, ...updated } : a));
      toast.success("Saved");
    }
  }

  async function remove(m: MediaItem) {
    if (!confirm(`Delete "${m.originalName}" permanently?`)) return;
    const res = await fetch(`/api/media/${m.id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((cur) => cur.filter((x) => x.id !== m.id));
      setSelected((cur) => cur.filter((x) => x.id !== m.id));
      setActive(null);
      toast.success("Deleted");
    } else toast.error("Could not delete");
  }

  return (
    <div className="flex h-full min-h-[480px] flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <button type="button" className="btn-primary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />} Upload files
        </button>
        <input ref={fileRef} type="file" multiple accept={ACCEPT_ATTR[accept]} className="hidden" onChange={(e) => e.target.files && upload(e.target.files)} />
        {accept === "all" && (
          <select value={type} onChange={(e) => setType(e.target.value as Accept)} className="input w-auto py-1.5 text-sm" aria-label="Filter by type">
            <option value="all">All media</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="pdf">PDFs</option>
          </select>
        )}
        <div className="relative ml-auto">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search media…" className="input w-56 py-1.5 pl-8 text-sm" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Grid + drop zone */}
        <div
          className={cn("relative min-h-0 flex-1 overflow-y-auto p-3", drag && "bg-brand-50")}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            upload(e.dataTransfer.files);
          }}
        >
          {drag && <div className="pointer-events-none absolute inset-2 z-10 grid place-items-center rounded-xl border-2 border-dashed border-brand-500 text-lg font-semibold text-brand-700">Drop files to upload</div>}
          {!loading && !items.length ? (
            <button type="button" onClick={() => fileRef.current?.click()} className="flex h-full min-h-64 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line text-muted hover:border-brand-400">
              <ImagePlus className="size-10" />
              Drag files here or click to upload
              <span className="text-xs">PNG, JPG, WebP, GIF, SVG, ICO, MP4, WebM, PDF</span>
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
              {items.map((m) => {
                const isSel = selected.some((s) => s.id === m.id);
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => toggle(m)}
                    onDoubleClick={() => onSelect && onSelect([m])}
                    className={cn("relative aspect-square overflow-hidden rounded-lg border-2 bg-surface", isSel ? "border-brand-600" : active?.id === m.id ? "border-navy-300" : "border-transparent")}
                    title={m.originalName}
                  >
                    <Thumb m={m} />
                    {isSel && (
                      <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-brand-600 text-white">
                        <Check className="size-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
              {loading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton aspect-square" />)}
            </div>
          )}
          {hasMore && !loading && (
            <div className="mt-4 text-center">
              <button type="button" className="btn-light btn-sm" onClick={() => load(page + 1)}>
                Load more
              </button>
            </div>
          )}
        </div>

        {/* Details panel */}
        {active && (
          <aside className="hidden w-64 shrink-0 space-y-3 overflow-y-auto border-l border-line p-3 text-sm md:block">
            <div className="relative aspect-video overflow-hidden rounded-lg bg-surface">
              <Thumb m={active} className="object-contain" />
            </div>
            <p className="font-semibold break-all text-navy-900">{active.originalName}</p>
            <p className="text-xs text-muted">
              {formatDate(active.createdAt)} · {(active.size / 1024).toFixed(0)} KB{active.width ? ` · ${active.width}×${active.height}` : ""}
            </p>
            <label className="block">
              <span className="text-xs font-medium">Alt text (SEO)</span>
              <input key={`alt-${active.id}`} defaultValue={active.alt ?? ""} className="input py-1.5 text-sm" onBlur={(e) => e.target.value !== (active.alt ?? "") && saveDetails(active, { alt: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs font-medium">Title</span>
              <input key={`title-${active.id}`} defaultValue={active.title ?? ""} className="input py-1.5 text-sm" onBlur={(e) => e.target.value !== (active.title ?? "") && saveDetails(active, { title: e.target.value })} />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-light btn-sm flex-1"
                onClick={async () => {
                  await navigator.clipboard.writeText(new URL(active.url, window.location.origin).toString());
                  toast.success("URL copied");
                }}
              >
                <Copy className="size-3.5" /> Copy URL
              </button>
              <button type="button" className="btn-sm btn-light text-red-600" onClick={() => remove(active)} aria-label="Delete file">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </aside>
        )}
      </div>

      {onSelect && (
        <div className="flex items-center justify-between gap-3 border-t border-line p-3">
          <p className="text-sm text-muted">{selected.length ? `${selected.length} selected` : "Click an item to select it"}</p>
          <button type="button" className="btn-primary" disabled={!selected.length} onClick={() => onSelect(selected)}>
            {selectLabel}
          </button>
        </div>
      )}
    </div>
  );
}

export function MediaPickerModal({ open, onClose, onSelect, accept = "image", multiple, target, title = "Media Library" }: {
  open: boolean;
  onClose: () => void;
  onSelect: (items: MediaItem[]) => void;
  accept?: Accept;
  multiple?: boolean;
  target?: "gallery" | "profile";
  title?: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="full" className="h-[88vh]">
      <div className="h-[calc(88vh-70px)]">
        <MediaLibrary
          accept={accept}
          multiple={multiple}
          target={target}
          selectLabel={multiple ? "Add selected" : "Use this file"}
          onSelect={(items) => {
            onSelect(items);
            onClose();
          }}
        />
      </div>
    </Modal>
  );
}

/** Single file field: stores the URL in a hidden input called `name` */
export function MediaField({ name, defaultValue, accept = "image", label, help, target, onChange }: {
  name: string;
  defaultValue?: string | null;
  accept?: Accept;
  label?: string;
  help?: string;
  target?: "gallery" | "profile";
  onChange?: (url: string) => void;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const isImage = /\.(png|jpe?g|webp|gif|svg|ico)(\?|$)/i.test(value) || value.includes("randomuser.me");
  const set = (v: string) => {
    setValue(v);
    onChange?.(v);
  };
  return (
    <div>
      {label && <span className="label">{label}</span>}
      <input type="hidden" name={name} value={value} />
      <div className="flex items-center gap-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-line bg-surface">
          {value ? (
            isImage ? (
              <Image src={value} alt="" fill sizes="80px" className="object-cover" unoptimized={value.endsWith(".svg") || value.startsWith("http")} />
            ) : (
              <div className="grid h-full place-items-center text-muted">
                <FileText className="size-7" />
              </div>
            )
          ) : (
            <div className="grid h-full place-items-center text-muted">
              <ImagePlus className="size-7" />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex gap-2">
            <button type="button" className="btn-light btn-sm" onClick={() => setOpen(true)}>
              Choose from library
            </button>
            {value && (
              <button type="button" className="btn-ghost btn-sm text-red-600" onClick={() => set("")}>
                <X className="size-3.5" /> Remove
              </button>
            )}
          </div>
          <input value={value} onChange={(e) => set(e.target.value)} placeholder="…or paste a URL" className="input py-1.5 text-xs" aria-label={`${label ?? name} URL`} />
        </div>
      </div>
      {help && <p className="help">{help}</p>}
      <MediaPickerModal open={open} onClose={() => setOpen(false)} accept={accept} target={target} onSelect={(items) => items[0] && set(items[0].url)} />
    </div>
  );
}

/** Multiple images: stores a JSON array of URLs in a hidden input */
export function MediaMultiField({ name, defaultValue, label }: { name: string; defaultValue?: string[]; label?: string }) {
  const [urls, setUrls] = useState<string[]>(defaultValue ?? []);
  const [open, setOpen] = useState(false);
  return (
    <div>
      {label && <span className="label">{label}</span>}
      <input type="hidden" name={name} value={JSON.stringify(urls)} />
      <div className="flex flex-wrap gap-2">
        {urls.map((u, i) => (
          <div key={u + i} className="relative size-20 overflow-hidden rounded-lg border border-line">
            <Image src={u} alt="" fill sizes="80px" className="object-cover" unoptimized={u.endsWith(".svg")} />
            <button type="button" onClick={() => setUrls(urls.filter((_, j) => j !== i))} className="absolute top-1 right-1 rounded-full bg-white/90 p-0.5 text-red-600" aria-label="Remove image">
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setOpen(true)} className="grid size-20 place-items-center rounded-lg border-2 border-dashed border-line text-muted hover:border-brand-400">
          <ImagePlus className="size-6" />
        </button>
      </div>
      <MediaPickerModal open={open} onClose={() => setOpen(false)} multiple onSelect={(items) => setUrls([...urls, ...items.map((m) => m.url).filter((u) => !urls.includes(u))])} />
    </div>
  );
}
