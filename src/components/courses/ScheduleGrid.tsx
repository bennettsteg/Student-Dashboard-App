import {
  SCHEDULE_END_HOUR,
  SCHEDULE_START_HOUR,
  formatHourLabel,
  formatTimeOfDay,
  layoutDay,
} from "@/lib/schedule/layout";

import type { CourseScheduleDTO } from "./types";

export type { CourseScheduleDTO } from "./types";

const DAYS = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
];

const HOURS = Array.from(
  { length: SCHEDULE_END_HOUR - SCHEDULE_START_HOUR + 1 },
  (_, i) => SCHEDULE_START_HOUR + i,
);
const ROW_HEIGHT = 56; // px per hour
const GRID_HEIGHT = (SCHEDULE_END_HOUR - SCHEDULE_START_HOUR) * ROW_HEIGHT;
const COLUMNS = "56px repeat(5, minmax(0, 1fr))";

function courseTitle(course: CourseScheduleDTO): string {
  return course.code ? `${course.name} (${course.code})` : course.name;
}

/**
 * Read-only Monday-Friday week grid of Courses, 7 AM-10 PM, colour-coded by Course. A Course
 * without a colour falls back to the theme's primary. Phones get a per-day list instead of
 * the grid, which is too narrow to read there.
 */
export function ScheduleGrid({ courses }: { courses: CourseScheduleDTO[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:hidden">
        {DAYS.map((day) => {
          const dayCourses = courses
            .filter((course) => course.daysOfWeek.includes(day.value))
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          return (
            <section key={day.value} className="rounded-xl border border-border bg-card p-3">
              <h2 className="mb-2 text-sm font-semibold">{day.label}</h2>
              {dayCourses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No classes</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {dayCourses.map((course) => (
                    <li
                      key={course.id}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-primary-foreground"
                      style={{ backgroundColor: course.color ?? "var(--primary)" }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{courseTitle(course)}</div>
                        {course.location && (
                          <div className="truncate text-xs opacity-90">{course.location}</div>
                        )}
                      </div>
                      <div className="shrink-0 text-xs opacity-90">
                        {formatTimeOfDay(course.startTime)} – {formatTimeOfDay(course.endTime)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <div className="hidden max-h-[calc(100dvh-10rem)] overflow-auto rounded-xl border border-border bg-card md:block">
        <div className="min-w-[640px]">
          <div
            className="sticky top-0 z-10 grid border-b border-border bg-card"
            style={{ gridTemplateColumns: COLUMNS }}
          >
            <div />
            {DAYS.map((day) => (
              <div
                key={day.value}
                className="border-l border-border py-2.5 text-center text-sm font-medium text-muted-foreground"
              >
                {day.short}
              </div>
            ))}
          </div>
          <div className="grid" style={{ gridTemplateColumns: COLUMNS }}>
            <div className="relative" style={{ height: GRID_HEIGHT + 16 }}>
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute right-2 -translate-y-1/2 text-xs text-muted-foreground"
                  style={{ top: (hour - SCHEDULE_START_HOUR) * ROW_HEIGHT + 8 }}
                >
                  {formatHourLabel(hour)}
                </div>
              ))}
            </div>
            {DAYS.map((day) => {
              const dayCourses = courses.filter((course) => course.daysOfWeek.includes(day.value));
              const byId = new Map(dayCourses.map((course) => [course.id, course]));
              return (
                <div
                  key={day.value}
                  className="relative border-l border-border"
                  style={{ height: GRID_HEIGHT + 16 }}
                >
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="absolute inset-x-0 border-t border-border/60"
                      style={{ top: (hour - SCHEDULE_START_HOUR) * ROW_HEIGHT + 8 }}
                    />
                  ))}
                  {layoutDay(dayCourses, ROW_HEIGHT).map((block) => {
                    const course = byId.get(block.id)!;
                    const width = 100 / block.columns;
                    return (
                      <div
                        key={block.id}
                        className="absolute overflow-hidden rounded-md px-2 py-1 text-xs text-primary-foreground"
                        style={{
                          top: block.top + 8,
                          height: block.height,
                          left: `calc(${block.column * width}% + 2px)`,
                          width: `calc(${width}% - 4px)`,
                          backgroundColor: course.color ?? "var(--primary)",
                        }}
                        title={`${courseTitle(course)}, ${formatTimeOfDay(course.startTime)} – ${formatTimeOfDay(course.endTime)}`}
                      >
                        <div className="truncate font-medium">{courseTitle(course)}</div>
                        {course.location && (
                          <div className="truncate opacity-90">{course.location}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
