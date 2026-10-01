/** DASHBOARD → APPOINTMENT REQUESTS ( /dashboard/appointments?status= ) */
import Link from "next/link";
import { db, t, eq, and, asc } from "@/lib/db";
import type { AppointmentStatus as Status } from "@/db/schema";
import { getDashboard } from "@/lib/dashboard";
import { formatTime } from "@/lib/hours";
import { cn, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/panel/PanelUi";
import { EmptyState } from "@/components/ui/Misc";
import { AppointmentStatus } from "@/components/dashboard/LeadWidgets";

export const metadata = { title: "Appointments" };

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const { provider } = await getDashboard();
  const valid = ["NEW", "CONFIRMED", "COMPLETED", "CANCELLED"];
  const list = await db.query.appointmentRequests.findMany({
    where: and(
      eq(t.appointmentRequests.providerId, provider.id),
      // Optional status filter (and() skips the undefined part)
      status && valid.includes(status) ? eq(t.appointmentRequests.status, status as Status) : undefined,
    ),
    orderBy: [asc(t.appointmentRequests.date), asc(t.appointmentRequests.timeSlot)],
    limit: 200,
  });
  const locations = await db.query.providerLocations.findMany({ where: eq(t.providerLocations.providerId, provider.id), columns: { id: true, name: true } });
  return (
    <div className="space-y-6">
      <PageHeader title="Appointment Requests" subtitle="Contact the patient to confirm, then update the status." />
      <div className="flex flex-wrap gap-2">
        {["", ...valid].map((s) => (
          <Link key={s} href={s ? `?status=${s}` : "?"} className={cn("chip py-1.5", (status ?? "") === s && "border-navy-900 bg-navy-900 text-white")}>
            {s ? s.charAt(0) + s.slice(1).toLowerCase() : "All"}
          </Link>
        ))}
      </div>
      {!list.length ? (
        <EmptyState title="No appointment requests" text="Requests from your profile will show up here." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs text-muted uppercase">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Details</th>
                <th className="w-52 px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((a) => (
                <tr key={a.id} className="align-top">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <b className="text-navy-900">{formatDate(a.date, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}</b>
                    <br />
                    {formatTime(a.timeSlot)}
                    {a.locationId && <p className="text-xs text-muted">{locations.find((l) => l.id === a.locationId)?.name}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <b className="text-navy-900">
                      {a.firstName} {a.lastName}
                    </b>
                    <br />
                    <a href={`mailto:${a.email}`} className="link text-xs">{a.email}</a>
                    <br />
                    <a href={`tel:${a.phone}`} className="text-xs text-navy-700">{a.phone}</a>
                  </td>
                  <td className="max-w-sm px-4 py-3 text-xs text-navy-700">
                    <p>{a.reason || "—"}</p>
                    <p className="mt-1 text-muted">
                      {a.isNewPatient ? "New patient" : "Returning"} · {a.insurance || "No insurance given"} · prefers {a.preferredContact ?? "any"}
                      {a.dateOfBirth && <> · DOB {a.dateOfBirth}</>}
                    </p>
                    <p className="mt-1 text-muted">Requested {formatDate(a.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <AppointmentStatus id={a.id} status={a.status} note={a.providerNote} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
