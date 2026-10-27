import { localDate } from "@/lib/assignments/status";

/**
 * The Reminder guard. Pure: the clock and the student's IANA timezone are arguments, and
 * everything else is persisted state, so a worker restart re-evaluates to the same answer
 * and cannot cause a second Reminder in one local day.
 */

export interface ReminderGuardInput {
  /** The overall Reminders switch in Settings. */
  remindersEnabled: boolean;
  /** Reminder time of day in `timeZone`, zero-padded 24-hour "HH:mm". */
  reminderTime: string;
  /** The student's IANA timezone name. */
  timeZone: string;
  /** Local date (`YYYY-MM-DD`) a Reminder was last sent for, or null if never. */
  lastSentLocalDate: string | null;
  /** Assignments due today in `timeZone`. */
  dueTodayCount: number;
  now: Date;
}

const timeFormatters = new Map<string, Intl.DateTimeFormat>();

/** The wall-clock time (`HH:mm`, 24-hour, midnight is `00:00`) of `instant` in `timeZone`. */
export function localTimeOfDay(instant: Date, timeZone: string): string {
  let formatter = timeFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    timeFormatters.set(timeZone, formatter);
  }
  return formatter.format(instant);
}

/**
 * A Reminder is due when Reminders are enabled, the student's local time has reached their
 * reminder time, no Reminder has been sent for today's local date, and at least one
 * Assignment is due today. "Reached" means at or after, so a tick that runs late (or a
 * worker that was down at the reminder time) still sends it later the same day, and a
 * reminder time that a daylight-saving jump skips fires at the first moment after it.
 */
export function reminderDue({
  remindersEnabled,
  reminderTime,
  timeZone,
  lastSentLocalDate,
  dueTodayCount,
  now,
}: ReminderGuardInput): boolean {
  if (!remindersEnabled) return false;
  if (dueTodayCount < 1) return false;
  if (localDate(now, timeZone) === lastSentLocalDate) return false;
  // Both sides are zero-padded "HH:mm", so string order is time order.
  return localTimeOfDay(now, timeZone) >= reminderTime;
}
