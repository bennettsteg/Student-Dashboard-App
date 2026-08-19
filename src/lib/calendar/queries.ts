import { prisma } from "@/lib/db";

export interface NextAssignmentDTO {
  courseId: string | null;
  courseName: string;
  courseColor: string | null;
  eventId: string;
  title: string;
  dueAt: string; // ISO
}

/**
 * Upcoming manually-added assignments (tied to a manually-created course), soonest due
 * first. The dashboard's "what's due next" widget groups these client-side into "all
 * assignments due on each course's next due day" — that grouping has to happen in the
 * browser rather than here, since only the browser reliably knows the user's local
 * calendar day (the server may be running in a different timezone, e.g. a UTC Docker
 * host). Blackboard-derived events are reference-only and never appear here.
 */
export async function upcomingAssignments(userId: string): Promise<NextAssignmentDTO[]> {
  const events = await prisma.calendarEvent.findMany({
    where: {
      userId,
      isAssignment: true,
      source: "MANUAL",
      status: "ACTIVE",
      dueAt: { gte: new Date() },
    },
    include: { course: true },
    orderBy: { dueAt: "asc" },
  });

  return events.map((event) => ({
    courseId: event.courseId,
    courseName: event.course?.name ?? "No course",
    courseColor: event.course?.color ?? null,
    eventId: event.id,
    title: event.title,
    dueAt: event.dueAt!.toISOString(),
  }));
}
