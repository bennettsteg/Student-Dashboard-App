const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
}

/**
 * Short relative label for a Notification's received time ("2 hours ago", "Yesterday", "Fri",
 * "Oct 22"), in the runtime's local time. Pure: `now` is passed in.
 */
export function formatRelativeTime(date: Date, now: Date): string {
  const elapsedMs = now.getTime() - date.getTime();
  if (elapsedMs < 60_000) return "Just now";

  const minutes = Math.floor(elapsedMs / 60_000);
  const daysAgo = Math.round((startOfLocalDay(now) - startOfLocalDay(date)) / DAY_MS);

  if (daysAgo === 0) {
    return minutes < 60 ? plural(minutes, "minute") : plural(Math.floor(minutes / 60), "hour");
  }
  if (daysAgo === 1) return "Yesterday";
  if (daysAgo < 7) return WEEKDAYS[date.getDay()];

  const monthDay = `${MONTHS[date.getMonth()]} ${date.getDate()}`;
  return date.getFullYear() === now.getFullYear() ? monthDay : `${monthDay}, ${date.getFullYear()}`;
}
