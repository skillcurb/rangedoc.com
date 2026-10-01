"use client";
/**
 * Contact actions on the provider profile:
 *  - Request Appointment → modal with available dates, times and patient details
 *  - Email Provider      → modal with name, email/phone, subject, message
 * Both use server actions from src/lib/actions/public.ts.
 */
import { useActionState, useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requestAppointment, sendProviderMessage } from "@/lib/actions/public";
import { formatTime } from "@/lib/hours";
import { track } from "@/lib/client/track";
import { cn } from "@/lib/utils";

type Loc = { id: number; name: string; address: string };

// ─────────────────────────── Request appointment ───────────────────────────

export function AppointmentButton({ providerId, providerName, locations, insurances, className, label = "Request Appointment", icon = true }: {
  providerId: number;
  providerName: string;
  locations: Loc[];
  insurances: string[];
  className?: string;
  label?: string;
  icon?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={cn("btn-primary", className)}
        onClick={() => {
          setOpen(true);
          track("APPOINTMENT_CLICK", { providerId });
        }}
      >
        {icon && <CalendarDays className="size-5" />} {label}
      </button>
      {open && <AppointmentModal providerId={providerId} providerName={providerName} locations={locations} insurances={insurances} onClose={() => setOpen(false)} />}
    </>
  );
}

type Day = { date: string; slots: string[] };

function AppointmentModal({ providerId, providerName, locations, insurances, onClose }: { providerId: number; providerName: string; locations: Loc[]; insurances: string[]; onClose: () => void }) {
  const [days, setDays] = useState<Day[] | null>(null);
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [offset, setOffset] = useState(0); // date strip paging
  const [state, action] = useActionState(requestAppointment, null);

  useEffect(() => {
    fetch(`/api/providers/${providerId}/availability`)
      .then((r) => r.json())
      .then((d: { days: Day[] }) => {
        setDays(d.days);
        if (d.days[0]) setDate(d.days[0].date);
      });
  }, [providerId]);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Request sent");
      onClose();
    } else if (state.error) toast.error(state.error);
  }, [state, onClose]);

  const slots = days?.find((d) => d.date === date)?.slots ?? [];
  const visibleDays = days?.slice(offset, offset + 5) ?? [];

  return (
    <Modal open onClose={onClose} title="Request an appointment" description={`with ${providerName}`} size="lg">
      <form action={action} className="space-y-5 p-5">
        <input type="hidden" name="providerId" value={providerId} />
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="timeSlot" value={time} />

        {/* 1. Date */}
        <div>
          <p className="label">1. Choose a date</p>
          {!days ? (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" /> Loading availability…
            </div>
          ) : days.length === 0 ? (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">No online availability right now. Please use Call or Email instead.</p>
          ) : (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setOffset(Math.max(0, offset - 5))} disabled={offset === 0} className="btn-light p-2" aria-label="Previous dates">
                <ChevronLeft className="size-4" />
              </button>
              <div className="grid flex-1 grid-cols-5 gap-2">
                {visibleDays.map((d) => {
                  const dt = new Date(`${d.date}T12:00:00`);
                  return (
                    <button
                      type="button"
                      key={d.date}
                      onClick={() => {
                        setDate(d.date);
                        setTime("");
                      }}
                      className={cn("rounded-lg border px-1 py-2 text-center text-xs transition", date === d.date ? "border-brand-600 bg-brand-600 text-white" : "border-line hover:border-brand-400")}
                    >
                      <span className="block font-semibold">{dt.toLocaleDateString("en-US", { weekday: "short" })}</span>
                      <span className="block text-base font-bold">{dt.getDate()}</span>
                      <span className="block">{dt.toLocaleDateString("en-US", { month: "short" })}</span>
                    </button>
                  );
                })}
              </div>
              <button type="button" onClick={() => setOffset(Math.min((days.length || 5) - 5, offset + 5))} disabled={offset + 5 >= days.length} className="btn-light p-2" aria-label="More dates">
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>

        {/* 2. Time */}
        {slots.length > 0 && (
          <div>
            <p className="label">2. Choose a time</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {slots.map((s) => (
                <button type="button" key={s} onClick={() => setTime(s)} className={cn("rounded-lg border py-2 text-sm", time === s ? "border-brand-600 bg-brand-50 font-semibold text-brand-700" : "border-line hover:border-brand-400")}>
                  {formatTime(s)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3. Patient details */}
        <div>
          <p className="label">3. Your details</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="firstName" required placeholder="First name *" className="input" autoComplete="given-name" />
            <input name="lastName" required placeholder="Last name *" className="input" autoComplete="family-name" />
            <input name="email" type="email" required placeholder="Email *" className="input" autoComplete="email" />
            <input name="phone" type="tel" required placeholder="Phone *" className="input" autoComplete="tel" />
            <input name="dateOfBirth" type="date" className="input" aria-label="Date of birth" />
            <select name="isNewPatient" className="input" defaultValue="yes" aria-label="New patient?">
              <option value="yes">I&apos;m a new patient</option>
              <option value="no">I&apos;m a returning patient</option>
            </select>
            {locations.length > 1 && (
              <select name="locationId" className="input sm:col-span-2" aria-label="Location">
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} – {l.address}
                  </option>
                ))}
              </select>
            )}
            <select name="insurance" className="input" defaultValue="" aria-label="Insurance">
              <option value="">Insurance (optional)</option>
              {insurances.map((i) => (
                <option key={i}>{i}</option>
              ))}
              <option>Self-pay</option>
            </select>
            <select name="preferredContact" className="input" defaultValue="phone" aria-label="Preferred contact method">
              <option value="phone">Contact me by phone</option>
              <option value="email">Contact me by email</option>
              <option value="text">Contact me by text</option>
            </select>
            <textarea name="reason" rows={3} placeholder="Reason for visit (e.g. lower back pain for 3 weeks)" className="input sm:col-span-2" />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-light">
            Cancel
          </button>
          <SubmitButton disabled={!date || !time} pendingText="Sending…">
            Send Request
          </SubmitButton>
        </div>
        <p className="text-xs text-muted">This is a request, not a confirmed booking. The office will contact you to confirm your appointment.</p>
      </form>
    </Modal>
  );
}

// ─────────────────────────── Email provider ───────────────────────────

export function EmailProviderButton({ providerId, providerName, className }: { providerId: number; providerName: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={cn("btn-outline", className)}
        onClick={() => {
          setOpen(true);
          track("EMAIL_CLICK", { providerId });
        }}
      >
        <Mail className="size-5" /> Email Provider
      </button>
      {open && <EmailModal providerId={providerId} providerName={providerName} onClose={() => setOpen(false)} />}
    </>
  );
}

function EmailModal({ providerId, providerName, onClose }: { providerId: number; providerName: string; onClose: () => void }) {
  const [state, action] = useActionState(sendProviderMessage, null);
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Sent");
      onClose();
    } else if (state.error) toast.error(state.error);
  }, [state, onClose]);

  return (
    <Modal open onClose={onClose} title={`Email ${providerName}`} description="Your message goes straight to the provider's inbox.">
      <form action={action} className="space-y-3 p-5">
        <input type="hidden" name="providerId" value={providerId} />
        {/* Honeypot field – hidden from people, bots fill it in */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        <div>
          <label className="label" htmlFor="em-name">Your name</label>
          <input id="em-name" name="name" required className="input" autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="em-contact">Email or phone</label>
          <input id="em-contact" name="contact" required className="input" placeholder="you@example.com or (555) 555-5555" />
        </div>
        <div>
          <label className="label" htmlFor="em-subject">Subject</label>
          <input id="em-subject" name="subject" required className="input" placeholder="Question about treatment" />
        </div>
        <div>
          <label className="label" htmlFor="em-msg">Message</label>
          <textarea id="em-msg" name="message" required rows={5} className="input" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-light">
            Cancel
          </button>
          <SubmitButton pendingText="Sending…">Send Email</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
