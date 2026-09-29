/** DASHBOARD → MESSAGES ( /dashboard/messages ) – "Email provider" inbox */
import { prisma } from "@/lib/prisma";
import { getDashboard } from "@/lib/dashboard";
import { PageHeader } from "@/components/panel/PanelUi";
import { EmptyState } from "@/components/ui/Misc";
import { MessageItem } from "@/components/dashboard/LeadWidgets";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const { provider } = await getDashboard();
  const messages = await prisma.providerMessage.findMany({ where: { providerId: provider.id }, orderBy: { createdAt: "desc" }, take: 200 });
  const unread = messages.filter((m) => !m.read).length;
  return (
    <div className="space-y-6">
      <PageHeader title="Messages" subtitle={`${unread} unread · Emails sent from your profile are also delivered to ${provider.email || "your account email"}.`} />
      {!messages.length ? (
        <EmptyState title="No messages yet" />
      ) : (
        <ul className="space-y-2">
          {messages.map((m) => (
            <MessageItem key={m.id} m={{ ...m, createdAt: m.createdAt.toISOString() }} />
          ))}
        </ul>
      )}
    </div>
  );
}
