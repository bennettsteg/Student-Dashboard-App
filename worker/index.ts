// Long-running background worker. It does exactly two things: the automatic Mail Sync
// (ADR-0002) and the daily Reminder digest. Blackboard sync was removed (ADR-0001).
//
// Run exactly ONE instance. All guard state is persisted, so a restart never causes an extra
// sync or a second Reminder, but two instances ticking at once would each evaluate the guards
// and could both sync or both push.
//
// Both jobs are ticks that ask the database "is one due?" (src/lib/mail/autoSyncGuard.ts and
// src/lib/reminders/guard.ts); there is no sleep-until-tomorrow loop to drift or double-fire.
//  - mail: hourly, at most one Graph call per user per 24 hours.
//  - reminders: every few minutes, reads only the local database (and sends the push).

import { runMailAutoSyncTick } from "@/lib/mail/autoSync";
import { runReminderTick } from "@/lib/reminders/tick";

const MAIL_TICK_MS = 60 * 60 * 1000;
const REMINDER_TICK_MS = 5 * 60 * 1000;

/**
 * Wraps a tick so a slow run never overlaps the next one, and a failing tick (e.g. database
 * unreachable) is logged and simply retried on the next interval.
 */
function guardedTick(name: string, run: () => Promise<string>) {
  let ticking = false;
  return async () => {
    if (ticking) return;
    ticking = true;
    try {
      console.log(`[worker] ${name} tick: ${await run()}`);
    } catch (e) {
      console.error(`[worker] ${name} tick failed:`, e instanceof Error ? e.message : e);
    } finally {
      ticking = false;
    }
  };
}

const mailTick = guardedTick("mail", async () => {
  const r = await runMailAutoSyncTick();
  return `${r.checked} user(s) checked, ${r.started} due, ${r.synced} synced, ${r.failed} failed`;
});

const reminderTick = guardedTick("reminder", async () => {
  const r = await runReminderTick();
  return `${r.checked} user(s) checked, ${r.due} due, ${r.delivered} delivered, ${r.errors} error(s)`;
});

console.log(
  `[worker] started; mail auto-sync ticks every ${MAIL_TICK_MS / 60_000} minutes, ` +
    `reminders every ${REMINDER_TICK_MS / 60_000} minutes.`,
);

// Tick once at startup: harmless after a restart because the guards read persisted state.
void mailTick();
void reminderTick();
const intervals = [
  setInterval(() => void mailTick(), MAIL_TICK_MS),
  setInterval(() => void reminderTick(), REMINDER_TICK_MS),
];

function shutdown(signal: string) {
  console.log(`[worker] received ${signal}, shutting down.`);
  for (const interval of intervals) clearInterval(interval);
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
