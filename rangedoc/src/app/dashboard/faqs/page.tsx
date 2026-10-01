/** DASHBOARD → FAQs ( /dashboard/faqs ) */
import Link from "next/link";
import { db, t, eq, asc } from "@/lib/db";
import { getDashboard } from "@/lib/dashboard";
import { PageHeader } from "@/components/panel/PanelUi";
import { FaqEditor } from "@/components/dashboard/DashboardEditors";

export const metadata = { title: "FAQs" };

export default async function FaqsPage() {
  const { provider, features } = await getDashboard();
  const faqs = await db.query.providerFaqs.findMany({ where: eq(t.providerFaqs.providerId, provider.id), orderBy: [asc(t.providerFaqs.sortOrder)] });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Frequently Asked Questions"
        subtitle={
          features.allowAllFaqs ? (
            "Add as many FAQs as you like. Visitors see 3 and can open the rest with “View all FAQs”."
          ) : (
            <>
              Your plan shows up to {features.maxFaqs} FAQs.{" "}
              <Link href="/dashboard/billing" className="link">
                Upgrade
              </Link>{" "}
              for unlimited FAQs and the “View all FAQs” button.
            </>
          )
        }
      />
      <FaqEditor faqs={faqs} canAdd={faqs.length < features.maxFaqs} />
    </div>
  );
}
