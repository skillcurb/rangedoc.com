/**
 * ADMIN PANEL layout ( /admin/* ) – sidebar built from the resource list.
 */
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { logoutAction } from "@/lib/actions/auth";
import { RESOURCES, RESOURCE_GROUPS } from "@/lib/admin/resources";
import { PanelShell, type NavSection } from "@/components/panel/PanelShell";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const [settings, pendingClaims, pendingReviews, pendingComments, newContacts, pendingOrders] = await Promise.all([
    getSettings(),
    prisma.provider.count({ where: { claimStatus: "PENDING" } }),
    prisma.review.count({ where: { status: "PENDING" } }),
    prisma.blogComment.count({ where: { status: "PENDING" } }),
    prisma.contactMessage.count({ where: { read: false } }),
    prisma.order.count({ where: { status: { in: ["PAID", "PROCESSING"] } } }),
  ]);
  const badges: Record<string, number> = { reviews: pendingReviews, comments: pendingComments, contacts: newContacts, orders: pendingOrders };

  const sections: NavSection[] = [
    {
      items: [
        { label: "Dashboard", href: "/admin", icon: "Home" },
        { label: "Analytics", href: "/admin/analytics", icon: "BarChart3" },
        { label: "Profile Claims", href: "/admin/claims", icon: "UserCheck", badge: pendingClaims },
        { label: "Media Library", href: "/admin/media", icon: "ImageIcon" },
        { label: "Import Providers (CSV)", href: "/admin/import", icon: "Upload" },
        { label: "Sitemap & Indexing", href: "/admin/sitemap", icon: "Globe" },
      ],
    },
    ...RESOURCE_GROUPS.map((g) => ({
      title: g,
      items: RESOURCES.filter((r) => r.group === g).map((r) => ({ label: r.label, href: `/admin/r/${r.key}`, icon: r.icon, badge: badges[r.key] })),
    })),
    {
      title: "Settings",
      items: [
        { label: "Site Settings", href: "/admin/settings", icon: "Settings" },
        { label: "My Account", href: "/admin/account", icon: "KeyRound" },
      ],
    },
  ];

  return (
    <PanelShell
      siteName={settings.general.siteName}
      logo={settings.general.logo}
      sections={sections}
      user={{ name: user.name, subtitle: "Administrator", avatar: user.avatar }}
      logout={logoutAction}
      logoutTo="admin"
      accountHref="/admin/account"
      notifications={pendingClaims + pendingReviews + pendingComments + newContacts}
    >
      {children}
    </PanelShell>
  );
}
