/**
 * Header search: filters Assignments and Courses by name. Pure, so the same function serves
 * the client-side search box and its tests.
 */

export interface SearchableCourse {
  id: string;
  name: string;
  code: string | null;
}

export interface SearchableAssignment {
  id: string;
  title: string;
  courseId: string;
}

export interface SearchResult {
  kind: "course" | "assignment";
  id: string;
  title: string;
  subtitle: string;
  /** Where choosing the result navigates to. */
  href: string;
}

export const DEFAULT_SEARCH_LIMIT = 8;

/**
 * Case-insensitive substring match on Course name or code and Assignment title. Names that
 * start with the query come before names that merely contain it; within that, Courses come
 * before Assignments and each keeps the order it was given in. At most `limit` results.
 */
export function searchDashboard(
  query: string,
  assignments: SearchableAssignment[],
  courses: SearchableCourse[],
  limit = DEFAULT_SEARCH_LIMIT,
): SearchResult[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const courseById = new Map(courses.map((c) => [c.id, c]));
  const candidates: { result: SearchResult; startsWith: boolean }[] = [];

  for (const course of courses) {
    const name = course.name.toLowerCase();
    const code = course.code?.toLowerCase() ?? "";
    if (!name.includes(needle) && !code.includes(needle)) continue;
    candidates.push({
      startsWith: name.startsWith(needle) || code.startsWith(needle),
      result: {
        kind: "course",
        id: course.id,
        title: course.name,
        subtitle: "Course",
        href: `/courses/${course.id}`,
      },
    });
  }

  for (const assignment of assignments) {
    const title = assignment.title.toLowerCase();
    if (!title.includes(needle)) continue;
    candidates.push({
      startsWith: title.startsWith(needle),
      result: {
        kind: "assignment",
        id: assignment.id,
        title: assignment.title,
        subtitle: courseById.get(assignment.courseId)?.name ?? "Assignment",
        href: `/assignments?course=${assignment.courseId}&assignment=${assignment.id}`,
      },
    });
  }

  // Array.prototype.sort is stable, so ties keep their Courses-then-Assignments order.
  return candidates
    .sort((a, b) => Number(b.startsWith) - Number(a.startsWith))
    .slice(0, limit)
    .map((c) => c.result);
}
