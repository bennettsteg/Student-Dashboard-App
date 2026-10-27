import { prisma } from "@/lib/db";

import { parseCourseInput, type CourseInput } from "./validation";

/**
 * Database access for creating and editing Courses. Input is validated here (see
 * `parseCourseInput`), and a Course that is not the user's behaves as if it did not exist.
 */

export type CourseResult = { ok: true } | { ok: false; error: string };

const COURSE_COLORS = ["#9e1b32", "#c9a15a", "#5b7c99", "#6b8f71", "#7c5295", "#4a8c8c"];

export async function createCourse(userId: string, input: CourseInput): Promise<CourseResult> {
  const parsed = parseCourseInput(input);
  if (!parsed.ok) return parsed;

  const count = await prisma.course.count({ where: { userId } });
  await prisma.course.create({
    data: { userId, ...parsed.value, color: COURSE_COLORS[count % COURSE_COLORS.length] },
  });
  return { ok: true };
}

export async function updateCourse(
  userId: string,
  courseId: string,
  input: CourseInput,
): Promise<CourseResult> {
  const parsed = parseCourseInput(input);
  if (!parsed.ok) return parsed;

  const { count } = await prisma.course.updateMany({
    where: { id: courseId, userId },
    data: parsed.value,
  });
  return count > 0 ? { ok: true } : { ok: false, error: "That course no longer exists." };
}
