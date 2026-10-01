/** DASHBOARD → REVIEWS ( /dashboard/reviews ) – paid feature */
import Link from "next/link";
import { db, t, eq, and, desc, avg, count } from "@/lib/db";
import { getDashboard } from "@/lib/dashboard";
import { formatDate } from "@/lib/utils";
import { PageHeader, Panel, StatusBadge, UpgradeNotice } from "@/components/panel/PanelUi";
import { EmptyState } from "@/components/ui/Misc";
import { Stars } from "@/components/ui/Stars";

export const metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  const { provider, features } = await getDashboard();
  if (!features.allowReviews) return <UpgradeNotice feature="Patient reviews" text="Collect reviews from patients, show your star rating and stand out in search results." />;
  const [reviews, [agg]] = await Promise.all([
    db.query.reviews.findMany({ where: eq(t.reviews.providerId, provider.id), orderBy: [desc(t.reviews.createdAt)] }),
    // Average + count of approved reviews (AVG comes back as a string, or null when there are none)
    db
      .select({ avg: avg(t.reviews.rating), n: count() })
      .from(t.reviews)
      .where(and(eq(t.reviews.providerId, provider.id), eq(t.reviews.status, "APPROVED"))),
  ]);
  const avgRating = agg?.avg != null ? Number(agg.avg) : 0;
  return (
    <div className="space-y-6">
      <PageHeader title="Reviews" subtitle="New reviews are checked by our team before they appear on your profile." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Panel title="Average rating">
          <p className="flex items-center gap-2 text-3xl font-extrabold">
            {avgRating.toFixed(1)} <Stars value={avgRating} />
          </p>
          <p className="text-sm text-muted">{agg?.n ?? 0} approved reviews</p>
        </Panel>
        <Panel title="Displayed rating" className="sm:col-span-2">
          <p className="text-sm text-navy-700">
            {provider.displayRating ? (
              <>
                Your profile shows <b>{provider.displayRating}</b> from {provider.displayReviewCount ?? 0} {provider.ratingSource ?? ""} reviews.
              </>
            ) : (
              "You can show your rating from another platform (e.g. Google)."
            )}{" "}
            <Link href="/dashboard/profile" className="link">
              Change in profile settings
            </Link>
          </p>
        </Panel>
      </div>
      {!reviews.length ? (
        <EmptyState title="No reviews yet" text="Share your profile link with patients to collect reviews." />
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Stars value={r.rating} size={15} />
                <b className="text-navy-900">{r.title}</b>
                <StatusBadge status={r.status} />
                <span className="ml-auto text-xs text-muted">
                  {r.authorName} · {formatDate(r.createdAt)}
                </span>
              </div>
              <p className="mt-2 text-sm text-navy-700">{r.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
