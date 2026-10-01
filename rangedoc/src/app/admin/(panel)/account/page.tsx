/**
 * ADMIN – MY ACCOUNT ( /admin/account )
 * Change name, email, photo and password; manage Google / Facebook sign-in.
 * (Other admins' passwords can be reset in Admin → Users.)
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { db, t, eq } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { enabledOAuth } from "@/lib/oauth";
import { changeAdminPassword, saveAdminProfile, unlinkSocial } from "@/lib/admin/account";
import { PageHeader, Panel } from "@/components/panel/PanelUi";
import { ActionButton, ActionForm } from "@/components/forms/FormKit";
import { MediaField } from "@/components/media/MediaLibrary";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { PasswordInput } from "@/components/auth/AuthForms";

export const metadata = { title: "My Account" };

export default async function AdminAccountPage() {
  const me = await requireAdmin();
  const [user, oauth] = await Promise.all([db.query.users.findFirst({ where: eq(t.users.id, me.id) }), enabledOAuth()]);
  if (!user) notFound();
  return (
    <div className="space-y-6">
      <PageHeader title="My Account" subtitle="Your admin profile, password and sign-in methods." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Profile">
          <ActionForm action={saveAdminProfile} className="space-y-4">
            <MediaField name="avatar" defaultValue={user.avatar} label="Photo" />
            <label className="block">
              <span className="label">Name</span>
              <input name="name" required defaultValue={user.name} className="input" />
            </label>
            <label className="block">
              <span className="label">Email (used to sign in)</span>
              <input name="email" type="email" required defaultValue={user.email} className="input" />
            </label>
            <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
          </ActionForm>
        </Panel>

        <Panel title="Change password">
          <ActionForm action={changeAdminPassword} resetOnSuccess className="space-y-4">
            <label className="block">
              <span className="label">Current password</span>
              <PasswordInput name="currentPassword" placeholder="Current password" />
            </label>
            <label className="block">
              <span className="label">New password</span>
              <PasswordInput name="newPassword" placeholder="At least 8 characters, letters and numbers" autoComplete="new-password" />
            </label>
            <label className="block">
              <span className="label">Confirm new password</span>
              <PasswordInput name="confirmPassword" placeholder="Repeat new password" autoComplete="new-password" />
            </label>
            <SubmitButton pendingText="Updating…">Change password</SubmitButton>
          </ActionForm>
        </Panel>
      </div>

      <Panel title="Sign in with Google / Facebook">
        <p className="mb-4 text-sm text-muted">
          When enabled in{" "}
          <Link href="/admin/settings?tab=auth" className="link">
            Settings → Social login
          </Link>
          , you can sign in with a Google or Facebook account that uses the email <b>{user.email}</b>. It is linked automatically the first time.
        </p>
        <ul className="divide-y divide-line">
          {(
            [
              ["google", "Google", user.googleId, oauth.google],
              ["facebook", "Facebook", user.facebookId, oauth.facebook],
            ] as const
          ).map(([key, label, linked, enabled]) => (
            <li key={key} className="flex flex-wrap items-center gap-3 py-3">
              <span className="w-24 font-semibold text-navy-900">{label}</span>
              {linked ? (
                <span className="flex items-center gap-1 text-sm text-brand-700">
                  <CheckCircle2 className="size-4" /> Linked
                </span>
              ) : (
                <span className="text-sm text-muted">{enabled ? "Not linked yet – sign in with it once to link" : "Turned off"}</span>
              )}
              {linked && (
                <ActionButton run={unlinkSocial.bind(null, key)} confirm={`Unlink ${label}?`} className="btn-light btn-sm ml-auto">
                  Unlink
                </ActionButton>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
