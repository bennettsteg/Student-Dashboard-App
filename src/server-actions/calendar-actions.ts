"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  return session.user.id;
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

  revalidatePath("/calendar");
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

  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function moveEvent(id: string, start: string, end: string) {
  const userId = await requireUserId();

  await prisma.calendarEvent.updateMany({
    where: { id, userId },
    data: {
      startAt: new Date(start),
      endAt: new Date(end),
      userModified: true,
    },
  });

  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function deleteEvent(id: string) {
  const userId = await requireUserId();

  await prisma.calendarEvent.deleteMany({
    where: { id, userId },
  });

  revalidatePath("/calendar");
  revalidatePath("/");
}
