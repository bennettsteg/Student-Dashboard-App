"use server";

import { revalidatePath } from "next/cache";

import { syncBlackboardCalendarForUser, type SyncResult } from "@/lib/ical/sync";
import { resolveUserId } from "@/lib/session";

export async function triggerBlackboardSync(): Promise<SyncResult> {
  const userId = await resolveUserId();
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const icsUrl = process.env.BLACKBOARD_ICS_URL;
  if (!icsUrl) {
    throw new Error("BLACKBOARD_ICS_URL is not configured");
  }

  const result = await syncBlackboardCalendarForUser(userId, icsUrl);

  revalidatePath("/schedule");
  revalidatePath("/");

  return result;
}
