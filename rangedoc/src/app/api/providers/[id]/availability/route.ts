/**
 * GET /api/providers/{id}/availability
 * Available appointment dates + time slots for the next 21 days, based on
 * the provider's office hours minus already-requested slots.
 */
import { NextResponse } from "next/server";
import { db, t, eq, and, gte, lt, inArray } from "@/lib/db";
import { dayKey, parseHours, slotsForDay, ymd } from "@/lib/hours";

const DAYS_AHEAD = 21;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const provider = await db.query.providers.findFirst({
    where: eq(t.providers.id, Number(id)),
    columns: { id: true, officeHours: true, slotMinutes: true, acceptingNewPatients: true },
  });
  if (!provider) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hours = parseHours(provider.officeHours);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + DAYS_AHEAD);

  // Slots already taken (new or confirmed requests)
  const a = t.appointmentRequests;
  const taken = await db
    .select({ date: a.date, timeSlot: a.timeSlot })
    .from(a)
    .where(and(eq(a.providerId, provider.id), gte(a.date, start), lt(a.date, end), inArray(a.status, ["NEW", "CONFIRMED"])));
  const takenSet = new Set(taken.map((x) => `${x.date.toISOString().slice(0, 10)} ${x.timeSlot}`));

  const now = new Date();
  const days = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = ymd(d);
    const slots = slotsForDay(hours[dayKey(d)], provider.slotMinutes || 30).filter((s) => {
      if (takenSet.has(`${key} ${s}`)) return false;
      // Hide times that already passed today (+1h notice)
      if (i === 0) {
        const [h, m] = s.split(":").map(Number);
        return h * 60 + m > now.getHours() * 60 + now.getMinutes() + 60;
      }
      return true;
    });
    if (slots.length) days.push({ date: key, slots });
  }
  return NextResponse.json({ days, acceptingNewPatients: provider.acceptingNewPatients });
}
