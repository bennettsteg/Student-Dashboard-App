"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { syncBlackboardCalendarForUser, type SyncResult } from "@/lib/ical/sync";

export async function triggerBlackboardSync(): Promise<SyncResult> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  const icsUrl = process.env.BLACKBOARD_ICS_URL;
  if (!icsUrl) {
    throw new Error("BLACKBOARD_ICS_URL is not configured");
  }

  const result = await syncBlackboardCalendarForUser(session.user.id, icsUrl);

  revalidatePath("/calendar");
  revalidatePath("/courses");
  revalidatePath("/");

  return result;
}
