/** DASHBOARD → ACCOUNT SETTINGS ( /dashboard/settings ) */
import { getDashboard } from "@/lib/dashboard";
import { saveAccount } from "@/lib/actions/provider";
import { PageHeader, Panel } from "@/components/panel/PanelUi";
import { ActionForm } from "@/components/forms/FormKit";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user } = await getDashboard();
  return (
    <div className="space-y-6">
      <PageHeader title="Account Settings" />
      <Panel className="max-w-2xl">
        <ActionForm action={saveAccount} className="space-y-4">
          <label className="block">
            <span className="label">Your name</span>
            <input name="name" required defaultValue={user.name} className="input" />
          </label>
          <label className="block">
            <span className="label">Login email</span>
            <input name="email" type="email" required defaultValue={user.email} className="input" />
          </label>
          <div className="border-t border-line pt-4">
            <p className="mb-2 font-semibold">Change password</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="currentPassword" type="password" placeholder="Current password" className="input" autoComplete="current-password" />
              <input name="newPassword" type="password" placeholder="New password (min 8)" className="input" autoComplete="new-password" />
            </div>
          </div>
          <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
        </ActionForm>
      </Panel>
    </div>
  );
}
