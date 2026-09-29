/**
 * GET /api/providers/{id}/availability
 * Available appointment dates + time slots for the next 21 days, based on
 * the provider's office hours minus already-requested slots.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dayKey, parseHours, slotsForDay, ymd } from "@/lib/hours";

const DAYS_AHEAD = 21;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const provider = await prisma.provider.findUnique({ where: { id: Number(id) }, select: { id: true, officeHours: true, slotMinutes: true, acceptingNewPatients: true } });
  if (!provider) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hours = parseHours(provider.officeHours);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + DAYS_AHEAD);

  // Slots already taken (new or confirmed requests)
  const taken = await prisma.appointmentRequest.findMany({
    where: { providerId: provider.id, date: { gte: start, lt: end }, status: { in: ["NEW", "CONFIRMED"] } },
    select: { date: true, timeSlot: true },
  });
  const takenSet = new Set(taken.map((t) => `${t.date.toISOString().slice(0, 10)} ${t.timeSlot}`));

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
