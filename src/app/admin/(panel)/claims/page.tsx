/**
 * ADMIN – PROFILE CLAIMS ( /admin/claims )
 * Verify that the person claiming a profile really is that provider.
 */
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { db, t, eq, and, isNotNull, asc, desc } from "@/lib/db";
import { approveClaim, rejectClaim } from "@/lib/admin/actions";
import { formatDate, providerName } from "@/lib/utils";
import { PageHeader } from "@/components/panel/PanelUi";
import { EmptyState } from "@/components/ui/Misc";
import { ActionButton } from "@/components/forms/FormKit";

export const metadata = { title: "Profile Claims" };

export default async function ClaimsPage() {
  const [pending, recent] = await Promise.all([
    db.query.providers.findMany({ where: eq(t.providers.claimStatus, "PENDING"), with: { user: true, city: true }, orderBy: [asc(t.providers.updatedAt)] }),
    db.query.providers.findMany({
      where: and(eq(t.providers.claimStatus, "CLAIMED"), isNotNull(t.providers.claimedAt)),
      with: { user: true },
      orderBy: [desc(t.providers.claimedAt)],
      limit: 10,
    }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Profile Claims" subtitle="Check the license number / details, then approve or reject. The provider is emailed automatically." />
      {!pending.length ? (
        <EmptyState title="No claims waiting" text="New claims appear here when providers register to claim a listing." />
      ) : (
        <ul className="space-y-3">
          {pending.map((p) => (
            <li key={p.id} className="card flex flex-wrap items-start gap-4 p-5">
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-navy-900">
                  <Link href={`/provider/${p.slug}`} target="_blank" className="hover:text-brand-700">{providerName(p)}</Link>
                </p>
                <p className="text-sm text-muted">
                  {p.city ? `${p.city.name}, ${p.city.stateCode}` : ""} · License on file: {p.licenseNumber ?? "—"} {p.licenseState ?? ""}
                </p>
                <p className="mt-2 text-sm text-navy-800">
                  <b>Claimed by:</b> {p.user?.name} &lt;{p.user?.email}&gt;
                </p>
                <p className="mt-1 rounded-lg bg-surface p-3 text-sm whitespace-pre-line text-navy-700">{p.claimNote || "No note"}</p>
              </div>
              <div className="flex gap-2">
                <ActionButton run={approveClaim.bind(null, p.id)} className="btn-primary">
                  <CheckCircle2 className="size-4" /> Approve
                </ActionButton>
                <ActionButton run={rejectClaim.bind(null, p.id)} confirm="Reject this claim? The account will be unlinked." className="btn-light text-red-600">
                  <XCircle className="size-4" /> Reject
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      <section className="card p-5">
        <h2 className="mb-3 text-lg font-bold">Recently claimed</h2>
        <ul className="divide-y divide-line text-sm">
          {recent.map((p) => (
            <li key={p.id} className="flex justify-between py-2">
              <Link href={`/admin/r/providers/${p.id}`} className="font-medium text-navy-900 hover:text-brand-700">{providerName(p)}</Link>
              <span className="text-muted">{p.user?.email ?? "—"} · {formatDate(p.claimedAt)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
