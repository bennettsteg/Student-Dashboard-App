import { formatLongDate, localHour } from "@/lib/time";

/**
 * Dashboard header text. Pure: `now` and the student's IANA timezone are arguments. Formatting
 * pins the `en-US` locale so the text does not depend on the server's own locale.
 */

/** "Good afternoon, Sam" (just "Good afternoon" with no name), by the student's local hour. */
export function greeting(now: Date, timeZone: string, name: string | null): string {
  const hour = localHour(now, timeZone);
  const part = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const trimmed = name?.trim();
  return trimmed ? `Good ${part}, ${trimmed}` : `Good ${part}`;
}

/** "Monday, October 26 · Fall semester": today's local date, then the Term label if set. */
export function formatHeaderDate(now: Date, timeZone: string, termLabel: string | null): string {
  const date = formatLongDate(now, timeZone);
  const term = termLabel?.trim();
  return term ? `${date} · ${term}` : date;
}
