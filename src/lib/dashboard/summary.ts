/**
 * Dashboard numbers. Pure: the current time and the student's IANA timezone are arguments,
 * so "this week" and "today" mean the student's local calendar, never the server's.
 */

import { localDate } from "@/lib/assignments/status";

export interface SummaryStats {
  /** Open Assignments due on a local day of the current Monday-Sunday week. */
  dueThisWeek: number;
  /** The soonest due instant that has not passed yet, across all open Assignments. */
  nextDueAt: Date | null;
  openCount: number;
  /** How many distinct Courses the open Assignments belong to. */
  courseCount: number;
}

export interface WeekDay {
  /** Local calendar date, `YYYY-MM-DD`. */
  date: string;
  /** 0 = Monday ... 6 = Sunday. */
  index: number;
  /** Day of the month. */
  day: number;
  /** Open Assignments due on this local day. */
  count: number;
  isToday: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The seven local dates (`YYYY-MM-DD`) of the Monday-Sunday week containing `now`. */
function weekDates(now: Date, timeZone: string): string[] {
  const [year, month, day] = localDate(now, timeZone).split("-").map(Number);
  // Calendar arithmetic only, so UTC sidesteps daylight-saving shifts.
  const today = new Date(Date.UTC(year, month - 1, day));
  const sinceMonday = (today.getUTCDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1, day - sinceMonday + i));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  });
}

export function summaryStats(
  assignments: { courseId: string; dueAt: Date }[],
  now: Date,
  timeZone: string,
): SummaryStats {
  const week = new Set(weekDates(now, timeZone));
  let dueThisWeek = 0;
  let nextDueAt: Date | null = null;
  for (const { dueAt } of assignments) {
    if (week.has(localDate(dueAt, timeZone))) dueThisWeek++;
    if (dueAt.getTime() >= now.getTime() && (!nextDueAt || dueAt < nextDueAt)) nextDueAt = dueAt;
  }
  return {
    dueThisWeek,
    nextDueAt,
    openCount: assignments.length,
    courseCount: new Set(assignments.map((a) => a.courseId)).size,
  };
}

/** Monday through Sunday of the week containing `now`, with the count of Assignments due each day. */
export function weekStrip(
  assignments: { dueAt: Date }[],
  now: Date,
  timeZone: string,
): WeekDay[] {
  const today = localDate(now, timeZone);
  const counts = new Map<string, number>();
  for (const { dueAt } of assignments) {
    const key = localDate(dueAt, timeZone);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return weekDates(now, timeZone).map((date, index) => ({
    date,
    index,
    day: Number(date.slice(8)),
    count: counts.get(date) ?? 0,
    isToday: date === today,
  }));
}
