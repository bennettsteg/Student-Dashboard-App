"use server";

import { revalidatePath } from "next/cache";

import { buildTestPayload } from "@/lib/push/payload";
import { sendPushToUser } from "@/lib/push/send";
import {
  registerSubscription,
  removeSubscription,
  type PushSubscriptionInput,
  type RegisterResult,
} from "@/lib/push/subscriptions";
import { describeTestPushResult } from "@/lib/push/deviceSupport";
import { resolveUserId } from "@/lib/session";

/** Stores this device's push subscription ("Enable reminders on this device"). */
export async function enableDevicePush(subscription: PushSubscriptionInput): Promise<RegisterResult> {
  const userId = await resolveUserId();
  const result = await registerSubscription(userId, subscription);
  if (result.ok) revalidatePath("/settings");
  return result;
}

/** Forgets this device (turning reminders off on it). Other devices keep theirs. */
export async function disableDevicePush(endpoint: string): Promise<void> {
  const userId = await resolveUserId();
  await removeSubscription(userId, endpoint);
  revalidatePath("/settings");
}

/** Sends a test push to just this device and reports what happened in plain language. */
export async function sendTestPush(endpoint: string): Promise<{ ok: boolean; text: string }> {
  const userId = await resolveUserId();
  const result = await sendPushToUser(userId, buildTestPayload(), { endpoint });
  // A gone subscription was deleted by the send, so refresh the device count.
  if (result.removed > 0) revalidatePath("/settings");
  return describeTestPushResult(result);
}
