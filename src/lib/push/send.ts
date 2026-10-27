import webpush from "web-push";

import { prisma } from "@/lib/db";

import type { PushPayload } from "./payload";
import { readVapidConfig } from "./vapid";

/** Delivers one encrypted payload to one device. Throws with `statusCode` on a push service error. */
export type PushSender = (
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  body: string,
) => Promise<void>;

export interface SendResult {
  /** Devices the push service accepted. */
  sent: number;
  /** Devices whose subscription the push service reported gone (404/410); their rows are deleted. */
  removed: number;
  /** Devices that failed for any other reason; their rows are kept and retried next time. */
  failed: number;
  /** Set when nothing could be sent at all (push isn't configured on the server). */
  error?: string;
}

export interface SendOptions {
  /** Only this device. Used by the Settings "send a test push" action. */
  endpoint?: string;
  /** Replaces web-push + VAPID; for tests. */
  sender?: PushSender;
  /** Environment to read VAPID keys from (default process.env); ignored when `sender` is given. */
  env?: Record<string, string | undefined>;
}

/** A reminder is only useful the same day, so a push the device couldn't take is dropped after 12h. */
const TTL_SECONDS = 12 * 60 * 60;

function isGone(error: unknown): boolean {
  const status = (error as { statusCode?: unknown } | null)?.statusCode;
  return status === 404 || status === 410;
}

function createWebPushSender(env: SendOptions["env"]): PushSender | { error: string } {
  const vapid = readVapidConfig(env);
  if (!vapid.ok) return { error: vapid.error };
  const vapidDetails = {
    subject: vapid.subject,
    publicKey: vapid.publicKey,
    privateKey: vapid.privateKey,
  };
  return async (subscription, body) => {
    await webpush.sendNotification(subscription, body, { vapidDetails, TTL: TTL_SECONDS });
  };
}

/**
 * Sends `payload` to every device the user enabled (or just `options.endpoint`). Subscriptions
 * the push service says are gone are deleted here, so callers (the daily digest, the test push)
 * never need their own cleanup. One failing device never stops the others, and this never
 * throws for a delivery problem; it reports counts instead.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
  options: SendOptions = {},
): Promise<SendResult> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId, ...(options.endpoint ? { endpoint: options.endpoint } : {}) },
  });
  const result: SendResult = { sent: 0, removed: 0, failed: 0 };
  if (subscriptions.length === 0) return result;

  const sender = options.sender ?? createWebPushSender(options.env);
  if (typeof sender !== "function") return { ...result, error: sender.error };

  const body = JSON.stringify(payload);
  for (const subscription of subscriptions) {
    try {
      await sender(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        body,
      );
      result.sent += 1;
    } catch (error) {
      if (isGone(error)) {
        await prisma.pushSubscription.deleteMany({ where: { id: subscription.id } });
        result.removed += 1;
      } else {
        result.failed += 1;
        // Log the status only: the error text can echo the subscription endpoint.
        const status = (error as { statusCode?: unknown } | null)?.statusCode;
        console.error(`[push] delivery failed for subscription ${subscription.id} (status ${status ?? "none"})`);
      }
    }
  }
  return result;
}
