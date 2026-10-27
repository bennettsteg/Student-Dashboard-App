"use server";

import { revalidatePath } from "next/cache";

import { markAllRead, setNotificationRead as setRead } from "@/lib/mail/notifications";
import { runMailSync, type MailSyncOutcome } from "@/lib/mail/sync";
import { resolveUserId } from "@/lib/session";

function revalidateNotificationViews() {
  revalidatePath("/notifications");
  revalidatePath("/");
}

/** Manual "Sync mail": subject to the server-side cooldown and one-sync-at-a-time rule. */
export async function syncMail(): Promise<MailSyncOutcome> {
  const userId = await resolveUserId();
  const outcome = await runMailSync(userId, { trigger: "manual" });
  // A refused sync changes nothing; every other outcome updates the sync state shown on the page.
  if (outcome.status !== "cooldown" && outcome.status !== "already-running") {
    revalidateNotificationViews();
  }
  return outcome;
}

export async function setNotificationRead(id: string, isRead: boolean): Promise<void> {
  const userId = await resolveUserId();
  await setRead(userId, id, isRead);
  revalidateNotificationViews();
}

export async function markAllNotificationsRead(): Promise<void> {
  const userId = await resolveUserId();
  await markAllRead(userId);
  revalidateNotificationViews();
}
