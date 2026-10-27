"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { assignmentStatus, localDate, type AssignmentStatus } from "@/lib/assignments/status";
import { groupByDueDay, monthGrid, monthOf, shiftMonth, type YearMonth } from "@/lib/calendar/month";
import { cn } from "@/lib/utils";

export interface CalendarAssignmentDTO {
  id: string;
  title: string;
  dueAt: string; // ISO instant
  courseName: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const subscribeNever = () => () => {};
const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Chip colours per derived status. Due soon (and today) is the cream chip from the design. */
const CHIP_STYLE: Record<AssignmentStatus, string> = {
  overdue: "bg-destructive/25 text-foreground ring-1 ring-destructive/60",
  "due-today": "bg-due-soon text-due-soon-foreground",
  "due-soon": "bg-due-soon text-due-soon-foreground",
  upcoming: "bg-secondary text-secondary-foreground",
};

const DOT_STYLE: Record<AssignmentStatus, string> = {
  overdue: "bg-destructive",
  "due-today": "bg-due-soon",
  "due-soon": "bg-due-soon",
  upcoming: "bg-muted-foreground",
};

const LEGEND: { label: string; swatch: string }[] = [
  { label: "Due soon", swatch: "bg-due-soon" },
  { label: "Overdue", swatch: "bg-destructive" },
  { label: "Upcoming", swatch: "bg-secondary ring-1 ring-border" },
];

function dueTime(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
}

function monthTitle({ year, month }: YearMonth): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
}

/**
 * Month grid of open Assignment due dates only. Day grouping and "today" are resolved in
 * `timeZone` (the browser's timezone when not given), so the grid is only drawn once
 * hydrated: the server can't know the viewer's day.
 */
export function CalendarMonth({
  assignments,
  timeZone,
}: {
  assignments: CalendarAssignmentDTO[];
  timeZone?: string;
}) {
  const zone = useSyncExternalStore(
    subscribeNever,
    () => timeZone ?? browserTimeZone(),
    () => null,
  );
  if (zone === null) {
    return <CalendarHeading subtitle="Assignment due dates" />;
  }
  return <CalendarMonthInner assignments={assignments} timeZone={zone} />;
}

function CalendarHeading({
  subtitle,
  controls,
}: {
  subtitle: string;
  controls?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl">Calendar</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {controls}
    </div>
  );
}

function CalendarMonthInner({
  assignments,
  timeZone,
}: {
  assignments: CalendarAssignmentDTO[];
  timeZone: string;
}) {
  // `now` is captured once per mount; today does not move while the page is open.
  const [now] = useState(() => new Date());
  const todayKey = localDate(now, timeZone);
  const [shown, setShown] = useState<YearMonth>(() => monthOf(now, timeZone));

  const byDay = useMemo(
    () =>
      groupByDueDay(
        assignments.map((a) => ({ ...a, dueAt: new Date(a.dueAt) })),
        timeZone,
      ),
    [assignments, timeZone],
  );
  const weeks = monthGrid(shown);
  const agenda = weeks
    .flat()
    .filter((cell) => cell !== null && byDay.has(cell.key))
    .map((cell) => ({ cell: cell!, items: byDay.get(cell!.key)! }));

  const title = monthTitle(shown);
  const isCurrentMonth = monthTitle(monthOf(now, timeZone)) === title;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <CalendarHeading
        subtitle={`${title} · assignment due dates`}
        controls={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="icon"
              aria-label="Previous month"
              onClick={() => setShown((m) => shiftMonth(m, -1))}
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              variant="secondary"
              disabled={isCurrentMonth}
              onClick={() => setShown(monthOf(now, timeZone))}
            >
              Today
            </Button>
            <Button
              variant="secondary"
              size="icon"
              aria-label="Next month"
              onClick={() => setShown((m) => shiftMonth(m, 1))}
            >
              <ChevronRightIcon />
            </Button>
          </div>
        }
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="px-2 py-2.5 text-xs font-medium text-muted-foreground md:px-3 md:text-sm"
            >
              {day}
            </div>
          ))}
        </div>
        {weeks.map((week, weekIndex) => (
          <div
            key={weekIndex}
            className="grid grid-cols-7 border-b border-border last:border-b-0"
          >
            {week.map((cell, dayIndex) => {
              if (!cell) {
                return (
                  <div
                    key={dayIndex}
                    className="min-h-14 border-l border-border bg-surface-sunken first:border-l-0 md:min-h-28"
                  />
                );
              }
              const items = byDay.get(cell.key) ?? [];
              const isToday = cell.key === todayKey;
              return (
                <div
                  key={dayIndex}
                  className="flex min-h-14 min-w-0 flex-col gap-1 border-l border-border p-1.5 first:border-l-0 md:min-h-28 md:gap-1.5 md:p-2.5"
                >
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                      isToday && "bg-primary text-primary-foreground",
                    )}
                    aria-current={isToday ? "date" : undefined}
                  >
                    {cell.day}
                  </span>
                  <ul className="hidden flex-col gap-1.5 md:flex">
                    {items.map((item) => (
                      <li
                        key={item.id}
                        title={`${item.title} · ${item.courseName} · ${dueTime(item.dueAt.toISOString(), timeZone)}`}
                        className={cn(
                          "rounded-md px-2 py-1 text-xs leading-tight font-medium",
                          CHIP_STYLE[assignmentStatus(item.dueAt, now, timeZone)],
                        )}
                      >
                        {item.title}
                      </li>
                    ))}
                  </ul>
                  {items.length > 0 && (
                    <ul className="flex flex-wrap gap-1 md:hidden" aria-hidden>
                      {items.map((item) => (
                        <li
                          key={item.id}
                          className={cn(
                            "size-1.5 rounded-full",
                            DOT_STYLE[assignmentStatus(item.dueAt, now, timeZone)],
                          )}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {LEGEND.map((entry) => (
          <li key={entry.label} className="flex items-center gap-2">
            <span className={cn("size-3.5 rounded-[4px]", entry.swatch)} aria-hidden />
            {entry.label}
          </li>
        ))}
      </ul>

      {/* Phones: the grid cells only have room for dots, so list the month's due dates. */}
      <section className="flex flex-col gap-2 md:hidden" aria-label={`Due in ${title}`}>
        {agenda.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing due in {title}.</p>
        ) : (
          agenda.map(({ cell, items }) => (
            <div key={cell.key} className="rounded-xl border border-border bg-card p-3">
              <h2 className="mb-2 text-sm font-semibold">
                {new Date(`${cell.key}T12:00:00Z`).toLocaleDateString("en-US", {
                  timeZone: "UTC",
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </h2>
              <ul className="flex flex-col gap-1.5">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-sm",
                      CHIP_STYLE[assignmentStatus(item.dueAt, now, timeZone)],
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{item.title}</span>
                      <span className="block truncate text-xs opacity-80">{item.courseName}</span>
                    </span>
                    <span className="shrink-0 text-xs">
                      {dueTime(item.dueAt.toISOString(), timeZone)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
