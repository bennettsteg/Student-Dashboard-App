"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { resolveUserId } from "@/lib/session";

export interface CalendarEventInput {
  title: string;
  description?: string | null;
  location?: string | null;
  start: string; // ISO datetime
  end: string; // ISO datetime
  allDay: boolean;
  courseId?: string | null;
  isAssignment: boolean;
  dueAt?: string | null; // ISO datetime
}

async function requireUserId() {
  const userId = await resolveUserId();
  if (!userId) {
    throw new Error("Not authenticated");
  }
  return userId;
}

export async function createEvent(input: CalendarEventInput) {
  const userId = await requireUserId();

  await prisma.calendarEvent.create({
    data: {
      userId,
      courseId: input.courseId || null,
      title: input.title,
      description: input.description || null,
      location: input.location || null,
      startAt: new Date(input.start),
      endAt: new Date(input.end),
      allDay: input.allDay,
      source: "MANUAL",
      isAssignment: input.isAssignment,
      dueAt: input.isAssignment && input.dueAt ? new Date(input.dueAt) : null,
    },
  });

  revalidatePath("/");
}

export async function updateEvent(id: string, input: CalendarEventInput) {
  const userId = await requireUserId();

  await prisma.calendarEvent.updateMany({
    where: { id, userId },
    data: {
      courseId: input.courseId || null,
      title: input.title,
      description: input.description || null,
      location: input.location || null,
      startAt: new Date(input.start),
      endAt: new Date(input.end),
      allDay: input.allDay,
      isAssignment: input.isAssignment,
      dueAt: input.isAssignment && input.dueAt ? new Date(input.dueAt) : null,
      userModified: true,
    },
  });

  revalidatePath("/");
}

export async function deleteEvent(id: string) {
  const userId = await requireUserId();

  await prisma.calendarEvent.deleteMany({
    where: { id, userId },
  });

  revalidatePath("/");
}
