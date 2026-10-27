import { prisma } from "@/lib/db";

export interface AssignmentInput {
  title: string;
  notes?: string | null;
  courseId: string;
  /** ISO datetime of the due instant, already resolved in the student's own timezone. */
  dueAt: string;
}

/** Every Assignment needs a title and one of the student's own Courses. */
async function validate(userId: string, input: AssignmentInput) {
  if (!input.title.trim()) {
    throw new Error("Give this assignment a title.");
  }
  const course = input.courseId
    ? await prisma.course.findFirst({ where: { id: input.courseId, userId } })
    : null;
  if (!course) {
    throw new Error("Choose a course for this assignment.");
  }
  const dueAt = new Date(input.dueAt);
  if (Number.isNaN(dueAt.getTime())) {
    throw new Error("Choose a due date and time.");
  }
  return { title: input.title.trim(), notes: input.notes?.trim() || null, courseId: course.id, dueAt };
}

/** Returns the new Assignment's id. */
export async function createAssignment(userId: string, input: AssignmentInput): Promise<string> {
  const data = await validate(userId, input);
  const created = await prisma.assignment.create({ data: { ...data, userId } });
  return created.id;
}

export async function updateAssignment(userId: string, id: string, input: AssignmentInput) {
  const data = await validate(userId, input);
  await prisma.assignment.updateMany({ where: { id, userId }, data });
}

/** Complete = the student is finished with it, so it is permanently deleted. */
export async function completeAssignment(userId: string, id: string) {
  await prisma.assignment.deleteMany({ where: { id, userId } });
}
