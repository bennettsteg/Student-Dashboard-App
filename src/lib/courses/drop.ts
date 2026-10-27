import { prisma } from "@/lib/db";

/**
 * What dropping a Course also deletes, shown in the drop confirmation. `null` when the
 * Course does not exist or is not the user's.
 *
 * Grade Categories and Grade Entries are deleted by the same cascade, so the confirmation lists
 * them too.
 */
export interface CourseDropImpact {
  assignments: number;
  gradeCategories: number;
  gradeEntries: number;
}

export async function courseDropImpact(
  userId: string,
  courseId: string,
): Promise<CourseDropImpact | null> {
  const course = await prisma.course.findFirst({
    where: { id: courseId, userId },
    select: {
      _count: { select: { assignments: true, gradeCategories: true, gradeEntries: true } },
    },
  });
  if (!course) return null;
  return {
    assignments: course._count.assignments,
    gradeCategories: course._count.gradeCategories,
    gradeEntries: course._count.gradeEntries,
  };
}

/**
 * Drops a Course. Its Assignments, Grade Categories and Grade Entries go with it
 * through the foreign keys' ON DELETE CASCADE. Returns false when the Course is not the
 * user's, in which case nothing is deleted.
 */
export async function dropCourse(userId: string, courseId: string): Promise<boolean> {
  const { count } = await prisma.course.deleteMany({ where: { id: courseId, userId } });
  return count > 0;
}
