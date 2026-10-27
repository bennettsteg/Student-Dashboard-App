import { prisma } from "@/lib/db";

// The read flag is app-only: it is never written back to Outlook (the app only holds
// Mail.Read) and a Mail Sync never overwrites it after the Notification is first created.

export async function setNotificationRead(
  userId: string,
  notificationId: string,
  isRead: boolean,
): Promise<void> {
  const { count } = await prisma.notificationItem.updateMany({
    where: { id: notificationId, userId },
    data: { isRead },
  });
  if (count === 0) {
    throw new Error("Notification not found");
  }
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notificationItem.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}
