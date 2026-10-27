/**
 * Converting a local wall-clock reading in an IANA timezone to an absolute instant. Pure:
 * the timezone is an argument (the student's `User.timezone`), so the result never depends
 * on the browser's or the server's own zone.
 */

import { zonedFormatter } from "./formatters";

const DAY_MS = 24 * 60 * 60 * 1000;

/** `timeZone`'s offset from UTC in milliseconds at `instant` (positive east of UTC). */
function offsetAt(instant: number, timeZone: string): number {
  const parts: Record<string, number> = {};
  for (const part of zonedFormatter("en-US", timeZone, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(instant)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  const wallAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return wallAsUtc - Math.floor(instant / 1000) * 1000;
}

/**
 * The instant at which the clocks in `timeZone` read `day` (`YYYY-MM-DD`) and `time`
 * (`HH:mm`). Daylight saving is handled: a wall-clock time repeated by the autumn change
 * resolves to its first occurrence, and one skipped by the spring change resolves forward
 * by the length of the gap (02:30 becomes 03:30). Throws `RangeError` on a malformed day
 * or time.
 */
export function zonedTimeToInstant(day: string, time: string, timeZone: string): Date {
  const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dayMatch || !timeMatch) throw new RangeError(`Invalid local date/time: "${day}" "${time}"`);
  const [year, month, date] = dayMatch.slice(1).map(Number);
  const [hours, minutes] = timeMatch.slice(1).map(Number);
  if (hours > 23 || minutes > 59 || month < 1 || month > 12 || date < 1 || date > 31) {
    throw new RangeError(`Invalid local date/time: "${day}" "${time}"`);
  }

  // The wall-clock reading as if it were UTC; subtracting the zone's offset gives the instant.
  // A zone has at most one offset change within a day, so the offsets a day either side of
  // the reading are the only candidates.
  const wallAsUtc = Date.UTC(year, month - 1, date, hours, minutes);
  const before = offsetAt(wallAsUtc - DAY_MS, timeZone);
  const after = offsetAt(wallAsUtc + DAY_MS, timeZone);

  const valid = [...new Set([before, after])]
    .map((offset) => wallAsUtc - offset)
    .filter((candidate) => offsetAt(candidate, timeZone) === wallAsUtc - candidate)
    .sort((a, b) => a - b);

  // No valid candidate means the reading falls in a spring-forward gap.
  return new Date(valid.length > 0 ? valid[0] : wallAsUtc - before);
}
