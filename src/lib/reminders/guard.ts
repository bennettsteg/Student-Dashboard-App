import { localDate, localTimeOfDay } from "@/lib/time";

/**
 * The Reminder guard. Pure: the clock and the student's IANA timezone are arguments, and
 * everything else is persisted state, so a worker restart re-evaluates to the same answer
 * and cannot cause a second Reminder in one local day.
 */

/** How long after a failed attempt (every device failed transiently) the Reminder is retried. */
export const REMINDER_RETRY_MS = 15 * 60 * 1000;

export interface ReminderGuardInput {
  /** The overall Reminders switch in Settings. */
  remindersEnabled: boolean;
  /** Reminder time of day in `timeZone`, zero-padded 24-hour "HH:mm". */
  reminderTime: string;
  /** The student's IANA timezone name. */
  timeZone: string;
  /** Local date (`YYYY-MM-DD`) a Reminder was last sent for, or null if never. */
  lastSentLocalDate: string | null;
  /** When the last attempt failed transiently, or null/omitted if none did. */
  lastFailedAt?: Date | null;
  /** Assignments due today in `timeZone`. */
  dueTodayCount: number;
  now: Date;
}

/**
 * A Reminder is due when Reminders are enabled, the student's local time has reached their
 * reminder time, no Reminder has been sent for today's local date, and at least one
 * Assignment is due today. "Reached" means at or after, so a tick that runs late (or a
 * worker that was down at the reminder time) still sends it later the same day, and a
 * reminder time that a daylight-saving jump skips fires at the first moment after it.
 *
 * After a transient failure it waits REMINDER_RETRY_MS before trying again. Retries stop on
 * their own at local midnight, because the next day's attempt starts from a new local date.
 */
export function reminderDue({
  remindersEnabled,
  reminderTime,
  timeZone,
  lastSentLocalDate,
  lastFailedAt = null,
  dueTodayCount,
  now,
}: ReminderGuardInput): boolean {
  if (!remindersEnabled) return false;
  if (dueTodayCount < 1) return false;
  if (localDate(now, timeZone) === lastSentLocalDate) return false;
  if (lastFailedAt && now.getTime() - lastFailedAt.getTime() < REMINDER_RETRY_MS) return false;
  // Both sides are zero-padded "HH:mm", so string order is time order.
  return localTimeOfDay(now, timeZone) >= reminderTime;
}
