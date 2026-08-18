"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
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
      location: input.location || null,
      daysOfWeek: input.daysOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      color,
    },
  });

  revalidatePath("/schedule");
  revalidatePath("/assignments");
  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function updateCourse(id: string, input: CourseInput) {
  const userId = await requireUserId();

  await prisma.course.updateMany({
    where: { id, userId },
    data: {
      name: input.name,
      code: input.code || null,
      location: input.location || null,
      daysOfWeek: input.daysOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
    },
  });

  revalidatePath("/schedule");
  revalidatePath("/assignments");
  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function deleteCourse(id: string) {
  const userId = await requireUserId();

  // Assignments only exist as a concept tied to a manually-created course (see
  // /assignments), so deleting the course should take its assignments with it rather
  // than leaving them behind as orphaned "No course" rows. Non-assignment manual
  // calendar events tied to this course are left alone — they just lose the course
  // link (CalendarEvent.courseId is onDelete: SetNull).
  await prisma.$transaction([
    prisma.calendarEvent.deleteMany({
      where: { userId, courseId: id, isAssignment: true, source: "MANUAL" },
    }),
    prisma.course.deleteMany({ where: { id, userId } }),
  ]);

  revalidatePath("/schedule");
  revalidatePath("/assignments");
  revalidatePath("/calendar");
  revalidatePath("/");
}
