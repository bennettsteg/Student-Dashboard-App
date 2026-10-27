/**
 * Dashboard header text. Pure: `now` and the student's IANA timezone are arguments. Formatting
 * pins the `en-US` locale so the text does not depend on the server's own locale.
 */

function localHour(now: Date, timeZone: string): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  }).format(now);
  return Number(hour);
}

/** "Good afternoon, Sam" (just "Good afternoon" with no name), by the student's local hour. */
export function greeting(now: Date, timeZone: string, name: string | null): string {
  const hour = localHour(now, timeZone);
  const part = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const trimmed = name?.trim();
  return trimmed ? `Good ${part}, ${trimmed}` : `Good ${part}`;
}

/** "Monday, October 26 · Fall semester": today's local date, then the Term label if set. */
export function formatHeaderDate(now: Date, timeZone: string, termLabel: string | null): string {
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);
  const term = termLabel?.trim();
  return term ? `${date} · ${term}` : date;
}

/** "Tue, Oct 27": a due date in the student's timezone. */
export function formatDueDay(dueAt: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(dueAt);
}
