import { prisma } from "@/lib/db";

export interface NextAssignmentDTO {
  courseId: string;
  courseName: string;
  courseColor: string | null;
  assignmentId: string;
  title: string;
  dueAt: string; // ISO
}

/**
 * Upcoming Assignments, soonest due first. The dashboard's "what's due next" widget groups
 * these client-side into "all assignments due on each course's next due day" — that
 * grouping has to happen in the browser rather than here, since only the browser reliably
 * knows the user's local calendar day (the server may be running in a different timezone,
 * e.g. a UTC Docker host).
 */
export async function upcomingAssignments(userId: string): Promise<NextAssignmentDTO[]> {
  const assignments = await prisma.assignment.findMany({
    where: { userId, dueAt: { gte: new Date() } },
    include: { course: true },
    orderBy: { dueAt: "asc" },
  });

  return assignments.map((assignment) => ({
    courseId: assignment.courseId,
    courseName: assignment.course.name,
    courseColor: assignment.course.color,
    assignmentId: assignment.id,
    title: assignment.title,
    dueAt: assignment.dueAt.toISOString(),
  }));
}
