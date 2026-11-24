import { prisma } from "@/lib/db";
import { getProfile } from "@/lib/profile/profile";
import { requireUserId } from "@/lib/session";
import { formatDueDay, formatDueTime } from "@/lib/time";

import { NotificationList, type NotificationDTO } from "./NotificationList";

export default async function NotificationsPage() {
  const userId = await requireUserId();

  const [items, unreadCount, syncState, profile] = await Promise.all([
    prisma.notificationItem.findMany({
      where: { userId, source: "EMAIL" },
      orderBy: { receivedAt: "desc" },
      take: 50,
    }),
    prisma.notificationItem.count({ where: { userId, source: "EMAIL", isRead: false } }),
    prisma.mailSyncState.findUnique({ where: { userId } }),
    getProfile(userId),
  ]);

  const newMailAt = syncState?.lastNewMailAt ?? null;

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
        lastNewMailLabel: newMailAt
          ? `${formatDueDay(newMailAt, profile.timezone)}, ${formatDueTime(newMailAt, profile.timezone)}`
          : null,
        lastError: syncState?.lastError ?? null,
        needsReconnect: syncState?.needsReconnect ?? false,
      }}
    />
  );
}
