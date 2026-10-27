import { prisma } from "@/lib/db";

/** The JSON shape of a browser `PushSubscription` (`subscription.toJSON()`). */
export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export type RegisterResult = { ok: true } | { ok: false; error: string };

const INVALID = "This device didn't give a valid push subscription.";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Stores this device's subscription for the user (one row per device). Registering the same
 * endpoint again updates its keys, so pressing Enable twice never creates duplicates.
 */
export async function registerSubscription(
  userId: string,
  input: PushSubscriptionInput,
): Promise<RegisterResult> {
  const endpoint = input?.endpoint;
  const p256dh = input?.keys?.p256dh;
  const auth = input?.keys?.auth;
  if (
    !isNonEmptyString(endpoint) ||
    !isHttpsUrl(endpoint) ||
    !isNonEmptyString(p256dh) ||
    !isNonEmptyString(auth)
  ) {
    return { ok: false, error: INVALID };
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, p256dh, auth },
    update: { userId, p256dh, auth },
  });
  return { ok: true };
}

/** Removes one of the user's devices (turning Reminders off on that device). */
export async function removeSubscription(userId: string, endpoint: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

export async function listSubscriptions(userId: string) {
  return prisma.pushSubscription.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
}
