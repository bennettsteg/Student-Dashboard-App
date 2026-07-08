"use client";

import dynamic from "next/dynamic";

import type { CourseOption } from "@/components/calendar/EventForm";
import type { CalendarEventDTO } from "@/components/calendar/CalendarView";

const CalendarView = dynamic(
  () => import("@/components/calendar/CalendarView").then((m) => m.CalendarView),
  { ssr: false },
);

export function CalendarViewClient({
  events,
  courses,
}: {
  events: CalendarEventDTO[];
  courses: CourseOption[];
}) {
  return <CalendarView events={events} courses={courses} />;
}
