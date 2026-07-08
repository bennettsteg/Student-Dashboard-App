import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";

import { NotificationList, type NotificationDTO } from "./NotificationList";

export default async function NotificationsPage() {
  const userId = await requireUserId();

  const items = await prisma.notificationItem.findMany({
    where: { userId },
    orderBy: { receivedAt: "desc" },
    take: 50,
  });

  const dtos: NotificationDTO[] = items.map((item) => ({
    id: item.id,
    subject: item.subject,
    preview: item.preview,
    fromName: item.fromName,
    fromAddress: item.fromAddress,
    receivedAt: item.receivedAt.toISOString(),
    isRead: item.isRead,
  }));

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-lg font-semibold">Notifications</h1>
      <NotificationList items={dtos} />
    </div>
  );
}
