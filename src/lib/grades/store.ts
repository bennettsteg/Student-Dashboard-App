import { prisma } from "@/lib/db";

import { currentGrade } from "./currentGrade";
import type { CategoryInput, ParsedEntry } from "./validation";

/**
 * Database access for Grade Categories and Grade Entries. Every function takes the user and
 * only touches rows that belong to one of that user's Courses; a Course, Category or Entry
 * that is not theirs behaves as if it did not exist (null / false, nothing written).
 */

export interface GradeEntryRow {
  id: string;
  categoryId: string;
  name: string;
  pointsEarned: number;
  pointsPossible: number;
  /** UTC-midnight instant of the entry's calendar date, or null. */
  date: Date | null;
}

export interface GradeCategoryRow {
  id: string;
  name: string;
  weight: number;
  entries: GradeEntryRow[];
}

export interface CourseGrades {
  course: { id: string; name: string; code: string | null; instructor: string | null };
  categories: GradeCategoryRow[];
}

/** A Course's Grade Scheme with its Grade Entries, or null if it is not the user's. */
export async function courseGrades(userId: string, courseId: string): Promise<CourseGrades | null> {
  const course = await prisma.course.findFirst({
    where: { id: courseId, userId },
    select: {
      id: true,
      name: true,
      code: true,
      instructor: true,
      gradeCategories: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          name: true,
          weight: true,
          entries: {
            orderBy: [{ date: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
            select: {
              id: true,
              categoryId: true,
              name: true,
              pointsEarned: true,
              pointsPossible: true,
              date: true,
            },
          },
        },
      },
    },
  });
  if (!course) return null;
  const { gradeCategories, ...rest } = course;
  return { course: rest, categories: gradeCategories };
}

/**
 * Current Grade of every one of the user's Courses, keyed by Course id: a percentage, or null
 * when the Course has no Grade Entries.
 */
export async function currentGradesByCourse(
  userId: string,
): Promise<Record<string, number | null>> {
  const courses = await prisma.course.findMany({
    where: { userId },
    select: {
      id: true,
      gradeCategories: {
        select: { weight: true, entries: { select: { pointsEarned: true, pointsPossible: true } } },
      },
    },
  });
  const grades: Record<string, number | null> = {};
  for (const course of courses) grades[course.id] = currentGrade(course.gradeCategories);
  return grades;
}

/** Adds a Grade Category to one of the user's Courses; null if the Course is not theirs. */
export async function addCategory(userId: string, courseId: string, input: CategoryInput) {
  const course = await prisma.course.findFirst({ where: { id: courseId, userId }, select: { id: true } });
  if (!course) return null;
  return prisma.gradeCategory.create({ data: { courseId, name: input.name, weight: input.weight } });
}

export async function updateCategory(
  userId: string,
  categoryId: string,
  input: CategoryInput,
): Promise<boolean> {
  const { count } = await prisma.gradeCategory.updateMany({
    where: { id: categoryId, course: { userId } },
    data: { name: input.name, weight: input.weight },
  });
  return count > 0;
}

/** What deleting a Category also deletes, for its confirmation; null if it is not the user's. */
export async function categoryDeleteImpact(
  userId: string,
  categoryId: string,
): Promise<{ entries: number } | null> {
  const category = await prisma.gradeCategory.findFirst({
    where: { id: categoryId, course: { userId } },
    select: { _count: { select: { entries: true } } },
  });
  return category ? { entries: category._count.entries } : null;
}

/** Deletes a Category; its Grade Entries go with it through ON DELETE CASCADE. */
export async function deleteCategory(userId: string, categoryId: string): Promise<boolean> {
  const { count } = await prisma.gradeCategory.deleteMany({
    where: { id: categoryId, course: { userId } },
  });
  return count > 0;
}

/** True when the Category belongs to this Course and the Course to this user. */
async function categoryInCourse(userId: string, courseId: string, categoryId: string) {
  const category = await prisma.gradeCategory.findFirst({
    where: { id: categoryId, courseId, course: { userId } },
    select: { id: true },
  });
  return category !== null;
}

/** Adds a Grade Entry; false if the Course is not the user's or the Category is not the Course's. */
export async function addEntry(
  userId: string,
  courseId: string,
  input: ParsedEntry,
): Promise<boolean> {
  if (!(await categoryInCourse(userId, courseId, input.categoryId))) return false;
  await prisma.gradeEntry.create({ data: { courseId, ...input } });
  return true;
}

/** Edits a Grade Entry; its Category may only move to another Category of the same Course. */
export async function updateEntry(
  userId: string,
  entryId: string,
  input: ParsedEntry,
): Promise<boolean> {
  const existing = await prisma.gradeEntry.findFirst({
    where: { id: entryId, course: { userId } },
    select: { courseId: true },
  });
  if (!existing) return false;
  if (!(await categoryInCourse(userId, existing.courseId, input.categoryId))) return false;
  await prisma.gradeEntry.update({ where: { id: entryId }, data: input });
  return true;
}

export async function deleteEntry(userId: string, entryId: string): Promise<boolean> {
  const { count } = await prisma.gradeEntry.deleteMany({
    where: { id: entryId, course: { userId } },
  });
  return count > 0;
}
