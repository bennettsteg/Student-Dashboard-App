"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { setMailReadState } from "@/lib/graph/mail";
import { getValidAccessToken } from "@/lib/graph/token";
import { syncMailNotifications, type MailSyncResult } from "@/lib/graph/syncNotifications";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  return session.user.id;
}

export async function refreshNotifications(): Promise<MailSyncResult> {
  const userId = await requireUserId();
  const result = await syncMailNotifications(userId);
  revalidatePath("/notifications");
  revalidatePath("/");
  return result;
}

export async function setNotificationRead(id: string, isRead: boolean): Promise<void> {
  const userId = await requireUserId();

  const item = await prisma.notificationItem.findFirst({ where: { id, userId } });
  if (!item) {
    throw new Error("Notification not found");
  }

  if (item.source === "EMAIL") {
    const accessToken = await getValidAccessToken(userId);
    await setMailReadState(accessToken, item.externalId, isRead);
  }

  await prisma.notificationItem.update({ where: { id }, data: { isRead } });

  revalidatePath("/notifications");
  revalidatePath("/");
}
