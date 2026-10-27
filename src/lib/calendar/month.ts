/**
 * Calendar month geometry and Assignment grouping. Pure: the student's IANA timezone is an
 * argument, so an Assignment lands on the local day it is due, never the server's.
 */

import { localDate } from "@/lib/assignments/status";

export interface YearMonth {
  year: number;
  month: number; // 1-12
}

export interface DayCell {
  /** The local calendar date, `YYYY-MM-DD`; the key used by `groupByDueDay`. */
  key: string;
  /** Day of the month, 1-31. */
  day: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The month as Sunday-first weeks of seven cells. Days of the neighbouring months are
 * `null` (drawn as empty cells), so a month takes four to six rows.
 */
export function monthGrid({ year, month }: YearMonth): (DayCell | null)[][] {
  // Calendar arithmetic only, so UTC avoids any daylight-saving surprises.
  const leading = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells: (DayCell | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ key: `${year}-${pad(month)}-${pad(day)}`, day });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (DayCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** The month that `instant` falls in, in `timeZone`. */
export function monthOf(instant: Date, timeZone: string): YearMonth {
  const [year, month] = localDate(instant, timeZone).split("-").map(Number);
  return { year, month };
}

/** Groups by local due date (`YYYY-MM-DD`); within a day, the soonest due comes first. */
export function groupByDueDay<T extends { dueAt: Date }>(
  assignments: T[],
  timeZone: string,
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  const sorted = [...assignments].sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  for (const assignment of sorted) {
    const key = localDate(assignment.dueAt, timeZone);
    const group = groups.get(key);
    if (group) group.push(assignment);
    else groups.set(key, [assignment]);
  }
  return groups;
}
