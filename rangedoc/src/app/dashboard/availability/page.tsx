/** DASHBOARD → AVAILABILITY ( /dashboard/availability ) – office hours drive the appointment calendar */
import { getDashboard } from "@/lib/dashboard";
import { saveAvailability } from "@/lib/actions/provider";
import { DAYS, parseHours } from "@/lib/hours";
import { PageHeader, Panel } from "@/components/panel/PanelUi";
import { ActionForm, Toggle } from "@/components/forms/FormKit";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const metadata = { title: "Availability" };

export default async function AvailabilityPage() {
  const { provider } = await getDashboard();
  const hours = parseHours(provider.officeHours);
  return (
    <ActionForm action={saveAvailability} className="space-y-6">
      <PageHeader title="Availability" subtitle="Patients can request appointment times inside your office hours." actions={<SubmitButton pendingText="Saving…">Save</SubmitButton>} />
      <Panel title="Office hours">
        <div className="divide-y divide-line">
          {DAYS.map((d) => (
            <div key={d.key} className="grid grid-cols-[110px_1fr] items-center gap-3 py-3 sm:grid-cols-[140px_160px_160px_1fr]">
              <span className="font-medium text-navy-900">{d.label}</span>
              <input type="time" name={`${d.key}_open`} defaultValue={hours[d.key].open} className="input" aria-label={`${d.label} opens`} />
              <input type="time" name={`${d.key}_close`} defaultValue={hours[d.key].close} className="input col-start-2 sm:col-start-auto" aria-label={`${d.label} closes`} />
              <label className="flex items-center gap-2 text-sm text-navy-800">
                <input type="checkbox" name={`${d.key}_closed`} defaultChecked={hours[d.key].closed} className="checkbox" /> Closed
              </label>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Appointment settings">
        <div className="grid gap-6 sm:grid-cols-2">
          <label>
            <span className="label">Appointment length</span>
            <select name="slotMinutes" defaultValue={provider.slotMinutes} className="input">
              {[15, 20, 30, 45, 60, 90].map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
          </label>
          <Toggle name="acceptingNewPatients" defaultChecked={provider.acceptingNewPatients} label="Accepting new patients" help="Shown on your profile and in search filters" />
        </div>
      </Panel>
    </ActionForm>
  );
}
