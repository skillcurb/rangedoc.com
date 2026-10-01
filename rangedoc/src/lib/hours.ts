/**
 * Office hours + appointment slot helpers.
 * officeHours JSON shape: { mon: { open: "08:00", close: "18:00", closed: false }, … }
 */
export const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
] as const;

export type DayHours = { open: string; close: string; closed: boolean };
export type OfficeHours = Record<string, DayHours>;

export const DEFAULT_HOURS: OfficeHours = {
  mon: { open: "08:00", close: "18:00", closed: false },
  tue: { open: "08:00", close: "18:00", closed: false },
  wed: { open: "08:00", close: "18:00", closed: false },
  thu: { open: "08:00", close: "18:00", closed: false },
  fri: { open: "08:00", close: "17:00", closed: false },
  sat: { open: "09:00", close: "13:00", closed: false },
  sun: { open: "", close: "", closed: true },
};

export function parseHours(value: unknown): OfficeHours {
  if (!value || typeof value !== "object") return DEFAULT_HOURS;
  const out: OfficeHours = {};
  for (const d of DAYS) {
    const v = (value as Record<string, Partial<DayHours>>)[d.key];
    out[d.key] = { open: v?.open ?? "", close: v?.close ?? "", closed: !!v?.closed || !v?.open };
  }
  return out;
}

/** "13:30" → "1:30 PM" */
export function formatTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** JS getDay() (0 = Sunday) → our key */
export function dayKey(date: Date) {
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][date.getDay()];
}

/** All start times for a day, e.g. ["08:00","08:30",…] */
export function slotsForDay(h: DayHours | undefined, slotMinutes: number) {
  if (!h || h.closed || !h.open || !h.close) return [];
  const toMin = (t: string) => {
    const [a, b] = t.split(":").map(Number);
    return a * 60 + b;
  };
  const out: string[] = [];
  for (let m = toMin(h.open); m + slotMinutes <= toMin(h.close); m += slotMinutes) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return out;
}

/** yyyy-mm-dd in local time */
export function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
