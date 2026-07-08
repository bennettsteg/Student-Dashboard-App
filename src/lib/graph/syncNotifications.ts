import { prisma } from "@/lib/db";
import { fetchRecentMail } from "@/lib/graph/mail";
import { getValidAccessToken } from "@/lib/graph/token";

export interface MailSyncResult {
  count: number;
}

export async function syncMailNotifications(userId: string): Promise<MailSyncResult> {
  const accessToken = await getValidAccessToken(userId);
  const messages = await fetchRecentMail(accessToken);

  for (const message of messages) {
    await prisma.notificationItem.upsert({
      where: {
        userId_source_externalId: { userId, source: "EMAIL", externalId: message.id },
      },
      update: {
        subject: message.subject,
        preview: message.bodyPreview,
        fromName: message.fromName,
        fromAddress: message.fromAddress,
        receivedAt: new Date(message.receivedDateTime),
        isRead: message.isRead,
        threadId: message.conversationId,
      },
      create: {
        userId,
        source: "EMAIL",
        externalId: message.id,
        threadId: message.conversationId,
        subject: message.subject,
        preview: message.bodyPreview,
        fromName: message.fromName,
        fromAddress: message.fromAddress,
        receivedAt: new Date(message.receivedDateTime),
        isRead: message.isRead,
      },
    });
  }

  return { count: messages.length };
}
