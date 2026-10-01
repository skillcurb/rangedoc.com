/**
 * DASHBOARD → PROFILE  ( /dashboard/profile )
 * Basic info, photo, bio, services (conditions / treatments / insurance),
 * paid features (video, displayed rating) and SEO.
 */
import Link from "next/link";
import { Lock } from "lucide-react";
import { db, t, eq, asc } from "@/lib/db";
import { getDashboard } from "@/lib/dashboard";
import { saveProfile } from "@/lib/actions/provider";
import { PageHeader, Panel } from "@/components/panel/PanelUi";
import { ActionForm, CheckboxGroup, Toggle } from "@/components/forms/FormKit";
import { MediaField } from "@/components/media/MediaLibrary";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const metadata = { title: "Profile" };

function Field({ label, children, help, className }: { label: string; children: React.ReactNode; help?: string; className?: string }) {
  return (
    <label className={className}>
      <span className="label">{label}</span>
      {children}
      {help && <span className="help block">{help}</span>}
    </label>
  );
}

export default async function ProfilePage() {
  const { provider: p, features } = await getDashboard();
  const [conditions, specialties, insurances, myConditions, mySpecialties, myInsurances] = await Promise.all([
    // All options for the checkbox lists
    db.select({ id: t.conditions.id, name: t.conditions.name }).from(t.conditions).where(eq(t.conditions.active, true)).orderBy(asc(t.conditions.sortOrder)),
    db.select({ id: t.specialties.id, name: t.specialties.name }).from(t.specialties).orderBy(asc(t.specialties.sortOrder)),
    db.select({ id: t.insurances.id, name: t.insurances.name }).from(t.insurances).orderBy(asc(t.insurances.sortOrder)),
    // Ids the provider has selected (rows of the many-to-many join tables)
    db.select({ id: t.providerConditions.conditionId }).from(t.providerConditions).where(eq(t.providerConditions.providerId, p.id)),
    db.select({ id: t.providerSpecialties.specialtyId }).from(t.providerSpecialties).where(eq(t.providerSpecialties.providerId, p.id)),
    db.select({ id: t.providerInsurances.insuranceId }).from(t.providerInsurances).where(eq(t.providerInsurances.providerId, p.id)),
  ]);

  return (
    <ActionForm action={saveProfile} className="space-y-6">
      <PageHeader
        title="Edit Profile"
        subtitle="This information appears on your public profile."
        actions={
          <>
            <Link href={`/provider/${p.slug}`} target="_blank" className="btn-light">
              Preview
            </Link>
            <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
          </>
        }
      />

      <Panel title="Basic information">
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <MediaField name="photo" defaultValue={p.photo} label="Profile photo" target="profile" help="Square or portrait photo, at least 400px wide." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Prefix"><input name="prefix" defaultValue={p.prefix ?? ""} className="input" placeholder="Dr." /></Field>
            <Field label="First name *"><input name="firstName" required defaultValue={p.firstName} className="input" /></Field>
            <Field label="Last name *"><input name="lastName" required defaultValue={p.lastName} className="input" /></Field>
            <Field label="Credentials"><input name="credentials" defaultValue={p.credentials ?? ""} className="input" placeholder="PT, DPT" /></Field>
            <Field label="Provider type">
              <select name="providerType" defaultValue={p.providerType} className="input">
                <option value="PHYSICAL_THERAPIST">Physical Therapist</option>
                <option value="CHIROPRACTOR">Chiropractor</option>
              </select>
            </Field>
            <Field label="Title shown under your name"><input name="headline" defaultValue={p.headline ?? ""} className="input" placeholder="Sports Physical Therapist" /></Field>
            <Field label="Practice name" className="sm:col-span-2"><input name="practiceName" defaultValue={p.practiceName ?? ""} className="input" /></Field>
            <Field label="Phone (hidden until clicked)"><input name="phone" defaultValue={p.phone ?? ""} className="input" /></Field>
            <Field label="Public email (for inquiries)"><input name="email" type="email" defaultValue={p.email ?? ""} className="input" /></Field>
            <Field label="Website" className="sm:col-span-2"><input name="website" defaultValue={p.website ?? ""} className="input" placeholder="https://www.yourpractice.com" /></Field>
            <Field label="Gender">
              <select name="gender" defaultValue={p.gender ?? ""} className="input">
                <option value="">Prefer not to say</option>
                <option>Female</option>
                <option>Male</option>
                <option>Non-binary</option>
              </select>
            </Field>
            <Field label="Languages"><input name="languages" defaultValue={p.languages ?? ""} className="input" placeholder="English, Spanish" /></Field>
            <Field label="Education"><input name="education" defaultValue={p.education ?? ""} className="input" /></Field>
            <Field label="Years of experience"><input name="yearsExperience" type="number" min={0} defaultValue={p.yearsExperience ?? ""} className="input" /></Field>
          </div>
        </div>
      </Panel>

      <Panel title="About you">
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Biography" className="lg:col-span-2"><textarea name="bio" rows={7} defaultValue={p.bio ?? ""} className="input" /></Field>
          <Field label="Personal quote"><textarea name="quote" rows={3} defaultValue={p.quote ?? ""} className="input" placeholder="My goal is to help you move without pain…" /></Field>
          <Field label="Response time note"><input name="responseTime" defaultValue={p.responseTime ?? ""} className="input" placeholder="Typically responds within 1 business day" /></Field>
          <Field label="“Best match for you” paragraph"><textarea name="bestMatch" rows={3} defaultValue={p.bestMatch ?? ""} className="input" /></Field>
          <Field label="Best match bullet points" help="One point per line"><textarea name="bestMatchPoints" rows={3} defaultValue={p.bestMatchPoints ?? ""} className="input" /></Field>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Toggle name="acceptingNewPatients" defaultChecked={p.acceptingNewPatients} label="Accepting new patients" />
          <Toggle name="inPerson" defaultChecked={p.inPerson} label="In-person visits" />
          <Toggle name="telehealth" defaultChecked={p.telehealth} label="Telehealth visits" />
        </div>
      </Panel>

      <div id="services" className="scroll-mt-20">
        <Panel title="Services">
          <div className="space-y-5">
            <div>
              <p className="label">Conditions treated</p>
              <CheckboxGroup name="conditionIds" options={conditions} selected={myConditions.map((c) => c.id)} />
            </div>
            <div>
              <p className="label">Treatment specialties</p>
              <CheckboxGroup name="specialtyIds" options={specialties} selected={mySpecialties.map((c) => c.id)} />
            </div>
            <div>
              <p className="label">Insurance accepted</p>
              <CheckboxGroup name="insuranceIds" options={insurances} selected={myInsurances.map((c) => c.id)} />
            </div>
          </div>
        </Panel>
      </div>

      <Panel title={<span className="flex items-center gap-2">Pro features {!features.isPaid && <Lock className="size-4 text-amber-500" />}</span>}>
        <div className="grid gap-4 lg:grid-cols-2">
          <p className="text-sm text-navy-700 lg:col-span-2">
            Intro video, video gallery and social links are on the{" "}
            <Link href="/dashboard/videos" className="link">Videos &amp; Social</Link> page.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Displayed rating"><input name="displayRating" type="number" step="0.1" min={0} max={5} defaultValue={p.displayRating ?? ""} className="input" disabled={!features.allowRatingDisplay} /></Field>
            <Field label="Review count"><input name="displayReviewCount" type="number" min={0} defaultValue={p.displayReviewCount ?? ""} className="input" disabled={!features.allowRatingDisplay} /></Field>
            <Field label="Source"><input name="ratingSource" defaultValue={p.ratingSource ?? ""} className="input" placeholder="Google" disabled={!features.allowRatingDisplay} /></Field>
          </div>
          <Field label="Professional endorsement" className="lg:col-span-2"><input name="endorsement" defaultValue={p.endorsement ?? ""} className="input" placeholder="Recommended by 12+ referring physicians in the Austin area." disabled={!features.allowRatingDisplay} /></Field>
        </div>
        {!features.isPaid && (
          <p className="mt-3 text-sm text-navy-700">
            <Link href="/dashboard/billing" className="link">Upgrade your plan</Link> to show videos, social links, your rating, endorsements, reviews and share buttons.
          </p>
        )}
      </Panel>

      <Panel title="Search engine (SEO)">
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Meta title" help="Leave empty to generate automatically"><input name="metaTitle" defaultValue={p.metaTitle ?? ""} className="input" maxLength={255} /></Field>
          <Field label="Meta description"><textarea name="metaDescription" rows={2} defaultValue={p.metaDescription ?? ""} className="input" maxLength={500} /></Field>
        </div>
      </Panel>

      <div className="flex justify-end">
        <SubmitButton className="px-8" pendingText="Saving…">Save changes</SubmitButton>
      </div>
    </ActionForm>
  );
}
