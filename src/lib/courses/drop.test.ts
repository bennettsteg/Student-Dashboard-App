import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";

import { courseDropImpact, dropCourse } from "./drop";

// Live-database tests (needs a reachable DATABASE_URL): dedicated users are created in setup
// and deleted in teardown, which cascades to everything the tests create.

const USER_ID = `course-drop-test-${process.pid}-${Date.now()}`;
const OTHER_USER_ID = `course-drop-other-${process.pid}-${Date.now()}`;
const DUE = new Date("2026-11-02T04:59:00.000Z");

async function createCourse(userId: string, name: string, assignmentTitles: string[]) {
  return prisma.course.create({
    data: {
      userId,
      name,
      instructor: "Dr. Example",
      daysOfWeek: [2, 4],
      startTime: "09:30",
      endTime: "10:45",
      assignments: {
        create: assignmentTitles.map((title) => ({ userId, title, dueAt: DUE })),
      },
    },
  });
}

beforeAll(async () => {
  await prisma.user.create({ data: { id: USER_ID } });
  await prisma.user.create({ data: { id: OTHER_USER_ID } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [USER_ID, OTHER_USER_ID] } } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.course.deleteMany({ where: { userId: { in: [USER_ID, OTHER_USER_ID] } } });
});

describe("dropCourse", () => {
  it("deletes the dropped Course and its Assignments and leaves other Courses untouched", async () => {
    const dropped = await createCourse(USER_ID, "Web Applications", ["Essay", "Lab 1"]);
    const kept = await createCourse(USER_ID, "Networking", ["Quiz", "Project", "Lab 2"]);

    const result = await dropCourse(USER_ID, dropped.id);

    expect(result).toBe(true);
    expect(await prisma.course.findUnique({ where: { id: dropped.id } })).toBeNull();
    expect(await prisma.assignment.count({ where: { courseId: dropped.id } })).toBe(0);

    expect(await prisma.course.findUnique({ where: { id: kept.id } })).not.toBeNull();
    const remaining = await prisma.assignment.findMany({
      where: { courseId: kept.id },
      orderBy: { title: "asc" },
    });
    expect(remaining.map((a) => a.title)).toEqual(["Lab 2", "Project", "Quiz"]);
  });

  it("does nothing for a Course that belongs to another user", async () => {
    const theirs = await createCourse(OTHER_USER_ID, "Not mine", ["Their essay"]);

    const result = await dropCourse(USER_ID, theirs.id);

    expect(result).toBe(false);
    expect(await prisma.course.findUnique({ where: { id: theirs.id } })).not.toBeNull();
    expect(await prisma.assignment.count({ where: { courseId: theirs.id } })).toBe(1);
  });
});

describe("courseDropImpact", () => {
  it("counts the Assignments that dropping the Course would also delete", async () => {
    const course = await createCourse(USER_ID, "Database Systems", ["A", "B", "C"]);
    await createCourse(USER_ID, "Other", ["X"]);

    const impact = await courseDropImpact(USER_ID, course.id);

    expect(impact).toEqual({ assignments: 3 });
  });

  it("reports nothing for a Course the user does not own", async () => {
    const theirs = await createCourse(OTHER_USER_ID, "Not mine", ["Their essay"]);

    expect(await courseDropImpact(USER_ID, theirs.id)).toBeNull();
  });
});
