"use server";

import { courseDropImpact, dropCourse, type CourseDropImpact } from "@/lib/courses/drop";
import { revalidateCourseViews } from "@/lib/courses/revalidate";
import {
  createCourse as createCourseRow,
  updateCourse as updateCourseRow,
  type CourseResult,
} from "@/lib/courses/store";
import type { CourseInput } from "@/lib/courses/validation";
import { requireUserId } from "@/lib/session";

export type CourseActionResult = CourseResult;

export async function createCourse(input: CourseInput): Promise<CourseActionResult> {
  const result = await createCourseRow(await requireUserId(), input);
  if (result.ok) revalidateCourseViews();
  return result;
}

export async function updateCourse(id: string, input: CourseInput): Promise<CourseActionResult> {
  const result = await updateCourseRow(await requireUserId(), id, input);
  if (result.ok) revalidateCourseViews();
  return result;
}

/** What dropping this Course would also delete, for the drop confirmation. */
export async function getCourseDropImpact(id: string): Promise<CourseDropImpact | null> {
  return courseDropImpact(await requireUserId(), id);
}

/** Drops a Course; its Assignments, Grade Categories and Grade Entries are deleted with it. */
export async function deleteCourse(id: string) {
  await dropCourse(await requireUserId(), id);
  revalidateCourseViews();
}
