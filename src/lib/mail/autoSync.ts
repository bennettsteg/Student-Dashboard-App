import { prisma } from "@/lib/db";

import { mailAutoSyncDue } from "./autoSyncGuard";
import { runMailSync, type MailSyncDeps } from "./sync";

export interface MailAutoSyncTickResult {
  /** Users with a connected Microsoft account that the tick looked at. */
  checked: number;
  /** Users the guard said were due, so a sync was started. */
  started: number;
  synced: number;
  failed: number;
}

/**
 * One hourly tick of the automatic Mail Sync (ADR-0002), called by the worker. Evaluates the
 * guard for every user with a connected Microsoft account, from persisted state only, and runs
 * the shared sync for those that are due. Holds no state between calls, so a worker restart
 * (or an overlapping tick) can never cause an extra sync. A sync is one Graph call; a failed
 * one is recorded by `runMailSync` and the guard then holds it back until the next window.
 */
export async function runMailAutoSyncTick(
  options: { deps?: MailSyncDeps } = {},
): Promise<MailAutoSyncTickResult> {
  const now = (options.deps?.now ?? (() => new Date()))();

  const users = await prisma.user.findMany({
    where: { accounts: { some: { provider: "microsoft-entra-id" } } },
    select: { id: true, mailSyncState: true },
  });

  const result: MailAutoSyncTickResult = { checked: users.length, started: 0, synced: 0, failed: 0 };
  for (const user of users) {
    const state = user.mailSyncState;
    const due = mailAutoSyncDue({
      lastSuccessAt: state?.lastSuccessAt ?? null,
      lastAttemptAt: state?.lastAttemptAt ?? null,
      needsReconnect: state?.needsReconnect ?? false,
      now,
    });
    if (!due) continue;

    result.started++;
    const outcome = await runMailSync(user.id, { trigger: "auto", deps: options.deps });
    if (outcome.status === "synced") result.synced++;
    else if (outcome.status === "failed") result.failed++;
  }
  return result;
}
