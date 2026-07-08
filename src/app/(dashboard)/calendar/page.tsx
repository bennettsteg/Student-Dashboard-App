import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import type { CalendarEventDTO } from "@/components/calendar/CalendarView";

import { CalendarViewClient } from "./CalendarViewClient";

export default async function CalendarPage() {
  const userId = await requireUserId();

  const [events, courses] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: { userId, status: "ACTIVE" },
      include: { course: true },
      orderBy: { startAt: "asc" },
    }),
    prisma.course.findMany({ where: { userId }, orderBy: { name: "asc" } }),
  ]);

  const eventDTOs: CalendarEventDTO[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.startAt.toISOString(),
    end: event.endAt.toISOString(),
    allDay: event.allDay,
    courseId: event.courseId,
    courseColor: event.course?.color ?? null,
    isAssignment: event.isAssignment,
    dueAt: event.dueAt ? event.dueAt.toISOString() : null,
    description: event.description,
    location: event.location,
    source: event.source,
  }));

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-lg font-semibold">Calendar</h1>
      <CalendarViewClient
        events={eventDTOs}
        courses={courses.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
      />
    </div>
  );
}
