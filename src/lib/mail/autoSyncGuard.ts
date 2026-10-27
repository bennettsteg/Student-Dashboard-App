/** The automatic Mail Sync window: at most one automatic sync per user per this long (ADR-0002). */
export const AUTO_SYNC_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface MailAutoSyncState {
  lastSuccessAt: Date | null;
  lastAttemptAt: Date | null;
  needsReconnect: boolean;
}

/**
 * Whether the worker's hourly tick should start an automatic Mail Sync for a user (ADR-0002).
 * Pure: the clock is passed in and everything else is persisted state, so a worker restart
 * re-evaluates to the same answer and cannot cause an extra sync.
 *
 * Due when Microsoft needs no reconnecting and a full 24-hour window has passed since both the
 * last successful sync and the last attempt of any kind. Checking the attempt too is what keeps
 * a failed run from being retried every tick: it waits for the next window instead. A user who
 * has never synced is due immediately.
 */
export function mailAutoSyncDue({
  lastSuccessAt,
  lastAttemptAt,
  needsReconnect,
  now,
}: MailAutoSyncState & { now: Date }): boolean {
  if (needsReconnect) return false;
  return windowElapsed(lastSuccessAt, now) && windowElapsed(lastAttemptAt, now);
}

function windowElapsed(since: Date | null, now: Date): boolean {
  if (!since) return true;
  return now.getTime() - since.getTime() >= AUTO_SYNC_WINDOW_MS;
}
