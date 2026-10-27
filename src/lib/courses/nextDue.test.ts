import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";

import { earliestDueByCourse } from "./nextDue";

// Live-database tests (needs a reachable DATABASE_URL): dedicated users are created in setup
// and deleted in teardown, which cascades to everything the tests create.

const USER_ID = `next-due-test-${process.pid}-${Date.now()}`;
const OTHER_USER_ID = `next-due-other-${process.pid}-${Date.now()}`;

async function course(userId: string, name: string, dueAts: string[]) {
  return prisma.course.create({
    data: {
      userId,
      name,
      daysOfWeek: [1],
      startTime: "09:00",
      endTime: "10:00",
      assignments: {
        create: dueAts.map((dueAt, i) => ({ userId, title: `Work ${i}`, dueAt: new Date(dueAt) })),
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

describe("earliestDueByCourse", () => {
  it("is each Course's earliest open Assignment, overdue work included", async () => {
    // Long-past dates make "overdue" independent of when the test runs.
    const mixed = await course(USER_ID, "Mixed", [
      "2999-01-05T12:00:00.000Z",
      "2000-01-03T12:00:00.000Z",
      "2000-01-01T12:00:00.000Z",
    ]);
    const onlyOverdue = await course(USER_ID, "Only overdue", ["2000-02-01T12:00:00.000Z"]);

    const due = await earliestDueByCourse(USER_ID);

    expect(due.get(mixed.id)).toEqual(new Date("2000-01-01T12:00:00.000Z"));
    expect(due.get(onlyOverdue.id)).toEqual(new Date("2000-02-01T12:00:00.000Z"));
  });

  it("has no entry for a Course without Assignments, nor for another user's Courses", async () => {
    const empty = await course(USER_ID, "Empty", []);
    const theirs = await course(OTHER_USER_ID, "Theirs", ["2999-01-01T12:00:00.000Z"]);

    const due = await earliestDueByCourse(USER_ID);

    expect(due.has(empty.id)).toBe(false);
    expect(due.has(theirs.id)).toBe(false);
  });
});
