/**
 * Assignment status rules. Pure: the current time and the student's IANA timezone are
 * arguments, nothing is read from the clock or the server's own timezone, and nothing here
 * is ever stored — status is derived at read time.
 */

import { localDate } from "@/lib/time";

export type AssignmentStatus = "overdue" | "due-today" | "due-soon" | "upcoming";

const DUE_SOON_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** True when `dueAt` falls on the same local calendar date as `now` in `timeZone`. */
export function isDueToday(dueAt: Date, now: Date, timeZone: string): boolean {
  return localDate(dueAt, timeZone) === localDate(now, timeZone);
}

/**
 * Overdue = past its due instant; Due today = same local calendar date; Due soon = due
 * within 7 days (inclusive) and not overdue; otherwise Upcoming. Overdue wins over Due
 * today, and Due today wins over Due soon.
 */
export function assignmentStatus(dueAt: Date, now: Date, timeZone: string): AssignmentStatus {
  if (dueAt.getTime() < now.getTime()) return "overdue";
  if (isDueToday(dueAt, now, timeZone)) return "due-today";
  if (dueAt.getTime() - now.getTime() <= DUE_SOON_WINDOW_MS) return "due-soon";
  return "upcoming";
}
