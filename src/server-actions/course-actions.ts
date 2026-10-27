"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { courseDropImpact, dropCourse, type CourseDropImpact } from "@/lib/courses/drop";
import { resolveUserId } from "@/lib/session";

const COURSE_COLORS = [
  "#9e1b32",
  "#c9a15a",
  "#5b7c99",
  "#6b8f71",
  "#7c5295",
  "#4a8c8c",
];

export interface CourseInput {
  name: string;
  code?: string | null;
  instructor?: string | null;
  location?: string | null;
  daysOfWeek: number[];
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

async function requireUserId() {
  const userId = await resolveUserId();
  if (!userId) {
    throw new Error("Not authenticated");
  }
  return userId;
}

export async function createCourse(input: CourseInput) {
  const userId = await requireUserId();

  const count = await prisma.course.count({ where: { userId } });
  const color = COURSE_COLORS[count % COURSE_COLORS.length];

  await prisma.course.create({
    data: {
      userId,
      name: input.name,
      code: input.code || null,
      instructor: input.instructor?.trim() || null,
      location: input.location || null,
      daysOfWeek: input.daysOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      color,
    },
  });

  revalidatePath("/schedule");
  revalidatePath("/courses");
  revalidatePath("/assignments");
  revalidatePath("/");
}

export async function updateCourse(id: string, input: CourseInput) {
  const userId = await requireUserId();

  await prisma.course.updateMany({
    where: { id, userId },
    data: {
      name: input.name,
      code: input.code || null,
      instructor: input.instructor?.trim() || null,
      location: input.location || null,
      daysOfWeek: input.daysOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
    },
  });

  revalidatePath("/schedule");
  revalidatePath("/courses");
  revalidatePath("/assignments");
  revalidatePath("/");
}

/** What dropping this Course would also delete, for the drop confirmation. */
export async function getCourseDropImpact(id: string): Promise<CourseDropImpact | null> {
  const userId = await requireUserId();
  return courseDropImpact(userId, id);
}

/** Drops a Course; its Assignments are deleted with it. */
export async function deleteCourse(id: string) {
  const userId = await requireUserId();
  await dropCourse(userId, id);

  revalidatePath("/schedule");
  revalidatePath("/courses");
  revalidatePath("/assignments");
  revalidatePath("/calendar");
  revalidatePath("/");
}
