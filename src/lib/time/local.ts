/**
 * Wall-clock readings of an instant in an IANA timezone. Pure: the timezone is always an
 * argument (the student's `User.timezone`), never the server's or the browser's own. Locales
 * are pinned (`en-CA`, `en-GB`, `en-US`) so output does not depend on the runtime's locale.
 */

import { zonedFormatter } from "./formatters";

/** The calendar date (`YYYY-MM-DD`) that `instant` falls on in `timeZone`. */
export function localDate(instant: Date, timeZone: string): string {
  return zonedFormatter("en-CA", timeZone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** The wall-clock time (`HH:mm`, 24-hour, midnight is `00:00`) of `instant` in `timeZone`. */
export function localTimeOfDay(instant: Date, timeZone: string): string {
  return zonedFormatter("en-GB", timeZone, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
}

/** The hour (0-23) of `instant` in `timeZone`. */
export function localHour(instant: Date, timeZone: string): number {
  return Number(
    zonedFormatter("en-US", timeZone, { hour: "numeric", hourCycle: "h23" }).format(instant),
  );
}

/** "Tue, Oct 27": a due date in `timeZone`. */
export function formatDueDay(dueAt: Date, timeZone: string): string {
  return zonedFormatter("en-US", timeZone, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(dueAt);
}

/** "11:59 PM": a due time in `timeZone`. */
export function formatDueTime(dueAt: Date, timeZone: string): string {
  return zonedFormatter("en-US", timeZone, { hour: "numeric", minute: "2-digit" }).format(dueAt);
}

/** "Monday, October 26": the long date of `instant` in `timeZone`. */
export function formatLongDate(instant: Date, timeZone: string): string {
  return zonedFormatter("en-US", timeZone, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(instant);
}
