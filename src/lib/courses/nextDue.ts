import { prisma } from "@/lib/db";

/**
 * Each Course's "Next due": the due instant of its earliest open Assignment, overdue work
 * included (an overdue Assignment is the most pressing thing a Course has). Courses without
 * Assignments have no entry. Completed Assignments are deleted, so every row is open.
 */
export async function earliestDueByCourse(userId: string): Promise<Map<string, Date>> {
  const rows = await prisma.assignment.groupBy({
    by: ["courseId"],
    where: { userId },
    _min: { dueAt: true },
  });
  const due = new Map<string, Date>();
  for (const row of rows) {
    if (row._min.dueAt) due.set(row.courseId, row._min.dueAt);
  }
  return due;
}
