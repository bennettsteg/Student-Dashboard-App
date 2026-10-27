import type { MailSyncOutcome } from "./sync";

export interface SyncMessage {
  text: string;
  isError: boolean;
}

/** The line shown after a manual "Sync mail", shared by Notifications and Settings. */
export function describeSyncOutcome(outcome: MailSyncOutcome): SyncMessage {
  switch (outcome.status) {
    case "synced":
      return {
        text: `Synced ${outcome.count} recent message${outcome.count === 1 ? "" : "s"}.`,
        isError: false,
      };
    case "cooldown":
      return {
        text: `Mail was synced a moment ago. Try again in ${outcome.retryAfterSeconds} second${outcome.retryAfterSeconds === 1 ? "" : "s"}.`,
        isError: true,
      };
    case "already-running":
      return { text: "A sync is already running.", isError: true };
    case "failed":
      return { text: `Sync failed: ${outcome.error}`, isError: true };
  }
}
