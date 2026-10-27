"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { resolveUserId } from "@/lib/session";

export interface AssignmentInput {
  title: string;
  notes?: string | null;
  courseId: string;
  dueAt: string; // ISO datetime
}

async function requireUserId() {
  const userId = await resolveUserId();
  if (!userId) {
    throw new Error("Not authenticated");
  }
  return userId;
}

function revalidateAssignmentPages() {
  revalidatePath("/");
  revalidatePath("/assignments");
  revalidatePath("/calendar");
  revalidatePath("/courses");
}

/** Every Assignment belongs to one of the user's own Courses. */
async function requireOwnCourse(userId: string, courseId: string) {
  const course = await prisma.course.findFirst({ where: { id: courseId, userId } });
  if (!course) {
    throw new Error("Choose a course for this assignment.");
  }
}

export async function createAssignment(input: AssignmentInput) {
  const userId = await requireUserId();
  await requireOwnCourse(userId, input.courseId);

  await prisma.assignment.create({
    data: {
      userId,
      courseId: input.courseId,
      title: input.title,
      notes: input.notes || null,
      dueAt: new Date(input.dueAt),
    },
  });

  revalidateAssignmentPages();
}

export async function updateAssignment(id: string, input: AssignmentInput) {
  const userId = await requireUserId();
  await requireOwnCourse(userId, input.courseId);

  await prisma.assignment.updateMany({
    where: { id, userId },
    data: {
      courseId: input.courseId,
      title: input.title,
      notes: input.notes || null,
      dueAt: new Date(input.dueAt),
    },
  });

  revalidateAssignmentPages();
}

export async function deleteAssignment(id: string) {
  const userId = await requireUserId();

  await prisma.assignment.deleteMany({
    where: { id, userId },
  });

  revalidateAssignmentPages();
}
