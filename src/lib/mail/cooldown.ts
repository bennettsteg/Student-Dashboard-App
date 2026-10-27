/** Minimum gap between two manual "Sync mail" attempts for one user. */
export const MANUAL_SYNC_COOLDOWN_SECONDS = 60;

export type CooldownDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * Decides whether a manual Mail Sync may start. Measured from the last *attempt* (not the last
 * success) so a failing sync can't be hammered either. Pure: `now` is passed in.
 */
export function manualSyncCooldown({
  lastAttemptAt,
  now,
}: {
  lastAttemptAt: Date | null;
  now: Date;
}): CooldownDecision {
  if (!lastAttemptAt) return { allowed: true };

  const elapsedMs = now.getTime() - lastAttemptAt.getTime();
  const remainingMs = MANUAL_SYNC_COOLDOWN_SECONDS * 1000 - elapsedMs;
  if (remainingMs <= 0) return { allowed: true };

  return { allowed: false, retryAfterSeconds: Math.ceil(remainingMs / 1000) };
}
