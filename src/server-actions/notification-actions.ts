"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { setMailReadState } from "@/lib/graph/mail";
import { getValidAccessToken } from "@/lib/graph/token";
import { syncMailNotifications, type MailSyncResult } from "@/lib/graph/syncNotifications";
import { resolveUserId } from "@/lib/session";

async function requireUserId() {
  const userId = await resolveUserId();
  if (!userId) {
    throw new Error("Not authenticated");
  }
  return userId;
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
