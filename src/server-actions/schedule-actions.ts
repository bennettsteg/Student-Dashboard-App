"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const CLASS_COLORS = [
  "#9e1b32",
  "#c9a15a",
  "#5b7c99",
  "#6b8f71",
  "#7c5295",
  "#4a8c8c",
];

export interface ScheduleClassInput {
  name: string;
  location?: string | null;
  daysOfWeek: number[];
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  return session.user.id;
}

export async function createScheduleClass(input: ScheduleClassInput) {
  const userId = await requireUserId();

  const count = await prisma.scheduleClass.count({ where: { userId } });
  const color = CLASS_COLORS[count % CLASS_COLORS.length];

  await prisma.scheduleClass.create({
    data: {
      userId,
      name: input.name,
      location: input.location || null,
      daysOfWeek: input.daysOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      color,
    },
  });

  revalidatePath("/schedule");
}

export async function deleteScheduleClass(id: string) {
  const userId = await requireUserId();

  await prisma.scheduleClass.deleteMany({
    where: { id, userId },
  });

  revalidatePath("/schedule");
}
