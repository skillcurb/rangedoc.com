"use client";
/**
 * Lead management widgets for the provider dashboard.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Mail, Phone, Reply, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { updateAppointment, markMessage, deleteMessage } from "@/lib/actions/provider";
import { cn } from "@/lib/utils";

const STATUSES = ["NEW", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;

export function AppointmentStatus({ id, status, note }: { id: number; status: string; note: string | null }) {
  const [pending, start] = useTransition();
  const [text, setText] = useState(note ?? "");
  const router = useRouter();
  const save = (s: (typeof STATUSES)[number], n?: string) =>
    start(async () => {
      await updateAppointment(id, s, n);
      toast.success("Updated");
      router.refresh();
    });
  return (
    <div className="space-y-2">
      <select disabled={pending} defaultValue={status} onChange={(e) => save(e.target.value as (typeof STATUSES)[number])} className="input py-1.5 text-sm" aria-label="Status">
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </option>
        ))}
      </select>
      <input value={text} onChange={(e) => setText(e.target.value)} onBlur={() => text !== (note ?? "") && save(status as (typeof STATUSES)[number], text)} placeholder="Private note…" className="input py-1.5 text-xs" />
    </div>
  );
}

export function MessageItem({ m }: { m: { id: number; name: string; contact: string; subject: string; message: string; read: boolean; createdAt: string } }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const isEmail = m.contact.includes("@");
  return (
    <li className={cn("rounded-xl border border-line bg-white", !m.read && "border-brand-300 bg-brand-50/30")}>
      <button
        type="button"
        className="flex w-full items-center gap-3 p-4 text-left"
        onClick={() => {
          setOpen(!open);
          if (!m.read) start(async () => { await markMessage(m.id, true); router.refresh(); });
        }}
      >
        {!m.read && <span className="size-2 shrink-0 rounded-full bg-brand-600" />}
        <span className="w-40 shrink-0 truncate font-semibold text-navy-900">{m.name}</span>
        <span className={cn("flex-1 truncate text-sm", m.read ? "text-navy-700" : "font-semibold text-navy-900")}>{m.subject}</span>
        <span className="shrink-0 text-xs text-muted">{new Date(m.createdAt).toLocaleDateString()}</span>
        <ChevronDown className={cn("size-4 shrink-0 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-line p-4">
          <p className="text-sm whitespace-pre-line text-navy-800">{m.message}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={isEmail ? `mailto:${m.contact}?subject=Re: ${encodeURIComponent(m.subject)}` : `tel:${m.contact}`} className="btn-primary btn-sm">
              {isEmail ? <Reply className="size-4" /> : <Phone className="size-4" />} {isEmail ? "Reply by email" : `Call ${m.contact}`}
            </a>
            <span className="flex items-center gap-1 text-xs text-muted">
              <Mail className="size-3.5" /> {m.contact}
            </span>
            <button type="button" disabled={pending} className="btn-light btn-sm ml-auto" onClick={() => start(async () => { await markMessage(m.id, false); router.refresh(); })}>
              Mark unread
            </button>
            <button
              type="button"
              disabled={pending}
              className="btn-light btn-sm text-red-600"
              onClick={() => confirm("Delete this message?") && start(async () => { await deleteMessage(m.id); toast.success("Deleted"); router.refresh(); })}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
