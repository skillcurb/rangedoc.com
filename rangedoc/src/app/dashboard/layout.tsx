/**
 * PROVIDER DASHBOARD layout ( /dashboard/* )
 * Sidebar items adapt to the provider's plan (locked items show a PRO tag).
 * While a claim is waiting for admin verification, only a notice is shown.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Crown, Hourglass } from "lucide-react";
import { db, t, eq, and } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getDashboard } from "@/lib/dashboard";
import { logoutAction } from "@/lib/actions/auth";
import { PanelShell, type NavSection } from "@/components/panel/PanelShell";
import { providerName } from "@/lib/utils";

export const metadata: Metadata = { title: { default: "Provider Dashboard", template: "%s | Provider Dashboard" }, robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [{ user, provider, features }, settings] = await Promise.all([getDashboard(), getSettings()]);
  const [newLeads, unread] = await Promise.all([
    db.$count(t.appointmentRequests, and(eq(t.appointmentRequests.providerId, provider.id), eq(t.appointmentRequests.status, "NEW"))),
    db.$count(t.providerMessages, and(eq(t.providerMessages.providerId, provider.id), eq(t.providerMessages.read, false))),
  ]);

  const sections: NavSection[] = [
    {
      items: [
        { label: "Overview", href: "/dashboard", icon: "Home" },
        { label: "Profile", href: "/dashboard/profile", icon: "UserRound" },
        { label: "Locations", href: "/dashboard/locations", icon: "MapPin" },
        { label: "Photos & Media", href: "/dashboard/media", icon: "ImageIcon" },
        { label: "Videos & Social", href: "/dashboard/videos", icon: "Film", locked: !features.allowVideo && !features.allowSocialLinks && !features.maxVideos },
        { label: "FAQs", href: "/dashboard/faqs", icon: "HelpCircle" },
        { label: "Availability", href: "/dashboard/availability", icon: "Clock" },
      ],
    },
    {
      title: "Leads",
      items: [
        { label: "Appointments", href: "/dashboard/appointments", icon: "CalendarCheck", badge: newLeads },
        { label: "Messages", href: "/dashboard/messages", icon: "Mail", badge: unread },
        { label: "Reviews", href: "/dashboard/reviews", icon: "Star", locked: !features.allowReviews },
        { label: "Analytics", href: "/dashboard/analytics", icon: "BarChart3", locked: !features.allowAnalytics },
      ],
    },
    { title: "Account", items: [{ label: "Billing & Plan", href: "/dashboard/billing", icon: "CreditCard" }, { label: "Settings", href: "/dashboard/settings", icon: "Settings" }] },
  ];

  const upsell = !features.isPaid ? (
    <div className="mx-1 rounded-xl bg-amber-50 p-4">
      <p className="flex items-center gap-2 font-bold text-navy-900">
        <Crown className="size-5 text-amber-500" /> Go Featured
      </p>
      <p className="mt-1 text-xs text-navy-700">Get more visibility. More patients. A bigger impact.</p>
      <Link href="/dashboard/billing" className="btn-primary btn-sm mt-3">
        Upgrade Now
      </Link>
    </div>
  ) : null;

  return (
    <PanelShell
      siteName={settings.general.siteName}
      logo={settings.general.logo}
      sections={sections}
      user={{ name: providerName(provider), subtitle: `${features.planName} account`, avatar: provider.photo }}
      logout={logoutAction}
      logoutTo="provider"
      accountHref="/dashboard/settings"
      sidebarExtra={upsell}
      notifications={newLeads + unread}
    >
      {provider.claimStatus === "PENDING" ? (
        <div className="card mx-auto mt-10 max-w-xl p-8 text-center">
          <Hourglass className="mx-auto size-12 text-amber-500" />
          <h1 className="mt-4 text-2xl font-bold">Your claim is being verified</h1>
          <p className="mt-2 text-navy-700">
            Thanks, {user.name}! Our team is confirming you own the profile of <b>{providerName(provider)}</b>. This usually takes 1–2 business days. You&apos;ll get an email once it&apos;s approved.
          </p>
          <Link href={`/provider/${provider.slug}`} className="btn-light mt-6" target="_blank">
            View public profile
          </Link>
        </div>
      ) : (
        children
      )}
    </PanelShell>
  );
}
