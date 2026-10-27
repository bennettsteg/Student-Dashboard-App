import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";

import { NotificationList, type NotificationDTO } from "./NotificationList";

export default async function NotificationsPage() {
  const userId = await requireUserId();

  const [items, unreadCount, syncState] = await Promise.all([
    prisma.notificationItem.findMany({
      where: { userId, source: "EMAIL" },
      orderBy: { receivedAt: "desc" },
      take: 50,
    }),
    prisma.notificationItem.count({ where: { userId, source: "EMAIL", isRead: false } }),
    prisma.mailSyncState.findUnique({ where: { userId } }),
  ]);

  const dtos: NotificationDTO[] = items.map((item) => ({
    id: item.id,
    subject: item.subject,
    preview: item.preview,
    fromName: item.fromName,
    fromAddress: item.fromAddress,
    receivedAt: item.receivedAt.toISOString(),
    isRead: item.isRead,
    webLink: item.webLink,
  }));

  return (
    <NotificationList
      items={dtos}
      unreadCount={unreadCount}
      sync={{
        lastSuccessAt: syncState?.lastSuccessAt?.toISOString() ?? null,
        lastError: syncState?.lastError ?? null,
        needsReconnect: syncState?.needsReconnect ?? false,
      }}
    />
  );
}
