"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { CourseEditForm } from "./CourseEditForm";
import type { CourseScheduleDTO } from "./types";

export type { CourseScheduleDTO } from "./types";

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
];

const HOUR_START = 7; // 7 AM
const HOUR_END = 22; // 10 PM
const HOURS = Array.from(
  { length: HOUR_END - HOUR_START + 1 },
  (_, i) => HOUR_START + i,
);
const ROW_HEIGHT = 48; // px per hour
const GRID_HEIGHT = (HOUR_END - HOUR_START) * ROW_HEIGHT;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatHour(hour: number): string {
  const period = hour < 12 || hour === 24 ? "AM" : "PM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display} ${period}`;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours < 12 ? "AM" : "PM";
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${display}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function ScheduleGrid({ courses }: { courses: CourseScheduleDTO[] }) {
  const router = useRouter();
  const [editingCourse, setEditingCourse] = useState<CourseScheduleDTO | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function openEdit(course: CourseScheduleDTO) {
    setEditingCourse(course);
    setDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:hidden">
        {DAYS.map((day) => {
          const dayCourses = courses
            .filter((course) => course.daysOfWeek.includes(day.value))
            .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
          return (
            <div key={day.value} className="rounded-xl border border-border bg-card p-3">
              <div className="mb-2 text-sm font-medium">{day.label}</div>
              {dayCourses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No classes</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {dayCourses.map((course) => (
                    <li key={course.id}>
                      <button
                        type="button"
                        onClick={() => openEdit(course)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-white hover:brightness-110"
                        style={{ backgroundColor: course.color ?? "#9e1b32" }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">
                            {course.name}
                            {course.code ? ` (${course.code})` : ""}
                          </div>
                          {course.location && (
                            <div className="truncate text-xs opacity-90">{course.location}</div>
                          )}
                        </div>
                        <div className="shrink-0 text-xs opacity-90">
                          {formatTime(course.startTime)} – {formatTime(course.endTime)}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
        <div className="min-w-[640px]">
          <div className="grid" style={{ gridTemplateColumns: "60px repeat(5, 1fr)" }}>
            <div />
            {DAYS.map((day) => (
              <div
                key={day.value}
                className="border-l border-border py-2 text-center text-sm font-medium"
              >
                {day.label}
              </div>
            ))}
          </div>
          <div className="grid" style={{ gridTemplateColumns: "60px repeat(5, 1fr)" }}>
            <div className="relative" style={{ height: GRID_HEIGHT }}>
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute right-2 -translate-y-1/2 text-xs text-muted-foreground"
                  style={{ top: (hour - HOUR_START) * ROW_HEIGHT }}
                >
                  {formatHour(hour)}
                </div>
              ))}
            </div>
            {DAYS.map((day) => (
              <div
                key={day.value}
                className="relative border-l border-border"
                style={{ height: GRID_HEIGHT }}
              >
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute inset-x-0 border-t border-border/50"
                    style={{ top: (hour - HOUR_START) * ROW_HEIGHT }}
                  />
                ))}
                {courses
                  .filter((course) => course.daysOfWeek.includes(day.value))
                  .map((course) => {
                    const startMin = Math.max(
                      timeToMinutes(course.startTime),
                      HOUR_START * 60,
                    );
                    const endMin = Math.min(timeToMinutes(course.endTime), HOUR_END * 60);
                    const top = ((startMin - HOUR_START * 60) / 60) * ROW_HEIGHT;
                    const height = Math.max(
                      ((endMin - startMin) / 60) * ROW_HEIGHT,
                      20,
                    );
                    return (
                      <button
                        key={course.id}
                        type="button"
                        onClick={() => openEdit(course)}
                        className="absolute inset-x-1 overflow-hidden rounded-md px-2 py-1 text-left text-xs text-white hover:brightness-110"
                        style={{ top, height, backgroundColor: course.color ?? "#9e1b32" }}
                      >
                        <div className="truncate font-medium">
                          {course.name}
                          {course.code ? ` (${course.code})` : ""}
                        </div>
                        {course.location && (
                          <div className="truncate opacity-90">{course.location}</div>
                        )}
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <CourseEditForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        course={editingCourse}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
