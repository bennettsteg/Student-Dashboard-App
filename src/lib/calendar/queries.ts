import { prisma } from "@/lib/db";

export interface NextAssignmentDTO {
  courseId: string | null;
  courseName: string;
  courseColor: string | null;
  eventId: string;
  title: string;
  dueAt: Date;
}

/**
 * Earliest upcoming assignment per course, for the dashboard's "what's due next" widget.
 * Only considers manually-added assignments (source: MANUAL) tied to a manually-created
 * course — Blackboard-derived events are reference-only and never appear here.
 */
export async function nextAssignmentPerCourse(userId: string): Promise<NextAssignmentDTO[]> {
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

  const seenCourses = new Set<string>();
  const result: NextAssignmentDTO[] = [];
  for (const event of events) {
    const key = event.courseId ?? "__none__";
    if (seenCourses.has(key)) continue;
    seenCourses.add(key);
    result.push({
      courseId: event.courseId,
      courseName: event.course?.name ?? "No course",
      courseColor: event.course?.color ?? null,
      eventId: event.id,
      title: event.title,
      dueAt: event.dueAt!,
    });
  }
  return result;
}
