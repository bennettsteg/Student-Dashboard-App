import { prisma } from "@/lib/db";
import { fetchRecentMail, type GraphMailItem } from "@/lib/graph/mail";
import { getValidAccessToken, MicrosoftReconnectRequiredError } from "@/lib/graph/token";

import { MANUAL_SYNC_COOLDOWN_SECONDS, manualSyncCooldown } from "./cooldown";

/** A sync that started this long ago and never finished is assumed dead (crashed process). */
const STALE_SYNC_MS = 5 * 60 * 1000;

/** The outside world a sync talks to; replaceable so tests need no Microsoft account. */
export interface MailSyncDeps {
  now: () => Date;
  getAccessToken: (userId: string) => Promise<string>;
  fetchRecentMail: (accessToken: string) => Promise<GraphMailItem[]>;
}

const defaultDeps: MailSyncDeps = {
  now: () => new Date(),
  getAccessToken: getValidAccessToken,
  fetchRecentMail: (accessToken) => fetchRecentMail(accessToken),
};

export type MailSyncOutcome =
  | { status: "synced"; count: number }
  | { status: "cooldown"; retryAfterSeconds: number }
  | { status: "already-running" }
  | { status: "failed"; error: string; needsReconnect: boolean };

/**
 * The one code path for Mail Sync, shared by the manual button and the automatic daily sync
 * (ADR-0002). One sync is one Graph call for the newest messages plus at most one token
 * refresh. At most one sync runs per user at a time; a manual sync is additionally refused
 * inside the cooldown that follows any attempt. Both are enforced here, against the database,
 * so concurrent requests (or a worker and the UI) cannot both get through.
 */
export async function runMailSync(
  userId: string,
  options: { trigger: "manual" | "auto"; deps?: MailSyncDeps },
): Promise<MailSyncOutcome> {
  const deps = options.deps ?? defaultDeps;
  const now = deps.now();

  const refusal = await claimSync(userId, options.trigger, now);
  if (refusal) return refusal;

  try {
    const accessToken = await deps.getAccessToken(userId);
    const messages = await deps.fetchRecentMail(accessToken);
    await storeMessages(userId, messages);

    await prisma.mailSyncState.update({
      where: { userId },
      data: {
        lastSuccessAt: now,
        lastError: null,
        needsReconnect: false,
        syncStartedAt: null,
      },
    });
    return { status: "synced", count: messages.length };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Mail sync failed";
    const needsReconnect = e instanceof MicrosoftReconnectRequiredError;
    await prisma.mailSyncState.update({
      where: { userId },
      data: {
        lastError: error,
        // Only ever raised here; a later successful sync is what clears it.
        ...(needsReconnect ? { needsReconnect: true } : {}),
        syncStartedAt: null,
      },
    });
    return { status: "failed", error, needsReconnect };
  }
}

/**
 * Atomically claims the right to sync (stamping the attempt time and the in-progress marker),
 * or returns why the sync must not run. The conditional UPDATE is the lock: only one of any
 * number of concurrent callers can match its WHERE clause.
 */
async function claimSync(
  userId: string,
  trigger: "manual" | "auto",
  now: Date,
): Promise<MailSyncOutcome | null> {
  await prisma.mailSyncState.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  const notRunning = [
    { syncStartedAt: null },
    { syncStartedAt: { lt: new Date(now.getTime() - STALE_SYNC_MS) } },
  ];
  const cooledDown =
    trigger === "manual"
      ? [
          { lastAttemptAt: null },
          { lastAttemptAt: { lte: new Date(now.getTime() - MANUAL_SYNC_COOLDOWN_SECONDS * 1000) } },
        ]
      : [{}];

  const { count } = await prisma.mailSyncState.updateMany({
    where: { userId, AND: [{ OR: notRunning }, { OR: cooledDown }] },
    data: { syncStartedAt: now, lastAttemptAt: now },
  });
  if (count === 1) return null;

  const state = await prisma.mailSyncState.findUniqueOrThrow({ where: { userId } });
  if (state.syncStartedAt && state.syncStartedAt.getTime() >= now.getTime() - STALE_SYNC_MS) {
    return { status: "already-running" };
  }
  const decision = manualSyncCooldown({ lastAttemptAt: state.lastAttemptAt, now });
  if (!decision.allowed) {
    return { status: "cooldown", retryAfterSeconds: decision.retryAfterSeconds };
  }
  // Lost a race that has since cleared; the caller can simply try again.
  return { status: "already-running" };
}

async function storeMessages(userId: string, messages: GraphMailItem[]): Promise<void> {
  for (const message of messages) {
    const fields = {
      threadId: message.conversationId,
      subject: message.subject,
      preview: message.bodyPreview,
      fromName: message.fromName,
      fromAddress: message.fromAddress,
      webLink: message.webLink,
      receivedAt: new Date(message.receivedDateTime),
    };
    await prisma.notificationItem.upsert({
      where: {
        userId_source_externalId: { userId, source: "EMAIL", externalId: message.id },
      },
      // The read flag is deliberately absent here: it is app-only and never overwritten.
      update: fields,
      create: { userId, source: "EMAIL", externalId: message.id, isRead: message.isRead, ...fields },
    });
  }
}
