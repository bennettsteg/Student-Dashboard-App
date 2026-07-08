"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const COURSE_COLORS = [
  "#9e1b32",
  "#c9a15a",
  "#5b7c99",
  "#6b8f71",
  "#7c5295",
  "#4a8c8c",
];

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  return session.user.id;
}

export async function createCourse(input: { name: string; code?: string | null }) {
  const userId = await requireUserId();

  const count = await prisma.course.count({ where: { userId } });
  const color = COURSE_COLORS[count % COURSE_COLORS.length];

  await prisma.course.create({
    data: {
      userId,
      name: input.name,
      code: input.code || null,
      color,
    },
  });

  revalidatePath("/courses");
  revalidatePath("/calendar");
}

export async function deleteCourse(id: string) {
  const userId = await requireUserId();

  await prisma.course.deleteMany({
    where: { id, userId },
  });

  revalidatePath("/courses");
  revalidatePath("/calendar");
}
