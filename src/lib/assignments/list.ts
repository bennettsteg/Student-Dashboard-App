/** A new Assignment is due at 11:59 PM unless the student says otherwise. */
export const DEFAULT_DUE_TIME = "23:59";

/**
 * The rows the Assignments table shows: optionally narrowed to one Course (`null` means all
 * Courses), sorted by due date with the soonest first. Equal due dates fall back to title so
 * the order is stable. Returns a new array.
 */
export function visibleAssignments<T extends { title: string; courseId: string; dueAt: string | Date }>(
  assignments: T[],
  courseId: string | null,
): T[] {
  return assignments
    .filter((a) => courseId === null || a.courseId === courseId)
    .sort(
      (a, b) =>
        new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime() || a.title.localeCompare(b.title),
    );
}
