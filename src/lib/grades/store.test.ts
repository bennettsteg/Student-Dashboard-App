import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";

import {
  addCategory,
  addEntry,
  categoryDeleteImpact,
  courseGrades,
  currentGradesByCourse,
  deleteCategory,
  deleteEntry,
  updateCategory,
  updateEntry,
} from "./store";

// Live-database tests (needs a reachable DATABASE_URL): dedicated users are created in setup
// and deleted in teardown, which cascades to everything the tests create.

const USER_ID = `grades-test-${process.pid}-${Date.now()}`;
const OTHER_USER_ID = `grades-other-${process.pid}-${Date.now()}`;

function newCourse(userId: string, name: string) {
  return prisma.course.create({
    data: { userId, name, daysOfWeek: [1], startTime: "09:00", endTime: "10:00" },
  });
}

function entry(categoryId: string, pointsEarned: number, pointsPossible: number, name = "Entry") {
  return { name, categoryId, pointsEarned, pointsPossible, date: null };
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

describe("Grade Categories", () => {
  it("adds Categories to a Course and lists them with their entries", async () => {
    const course = await newCourse(USER_ID, "Web Applications");
    const exams = await addCategory(USER_ID, course.id, { name: "Exams", weight: 40 });
    await addCategory(USER_ID, course.id, { name: "Projects", weight: 60 });
    expect(await addEntry(USER_ID, course.id, entry(exams!.id, 80, 100, "Midterm"))).toBe(true);

    const grades = await courseGrades(USER_ID, course.id);

    expect(grades?.categories.map((c) => [c.name, c.weight, c.entries.length])).toEqual([
      ["Exams", 40, 1],
      ["Projects", 60, 0],
    ]);
    expect(grades?.categories[0].entries[0]).toMatchObject({
      name: "Midterm",
      pointsEarned: 80,
      pointsPossible: 100,
    });
  });

  it("edits a Category's name and weight", async () => {
    const course = await newCourse(USER_ID, "Web Applications");
    const exams = await addCategory(USER_ID, course.id, { name: "Exams", weight: 40 });

    expect(await updateCategory(USER_ID, exams!.id, { name: "Tests", weight: 35.5 })).toBe(true);

    const grades = await courseGrades(USER_ID, course.id);
    expect(grades?.categories[0]).toMatchObject({ name: "Tests", weight: 35.5 });
  });

  it("does not add to, edit or delete a Course or Category owned by another user", async () => {
    const theirs = await newCourse(OTHER_USER_ID, "Not mine");
    const theirCategory = await addCategory(OTHER_USER_ID, theirs.id, { name: "Exams", weight: 100 });

    expect(await addCategory(USER_ID, theirs.id, { name: "Sneaky", weight: 10 })).toBeNull();
    expect(await updateCategory(USER_ID, theirCategory!.id, { name: "Mine", weight: 1 })).toBe(false);
    expect(await deleteCategory(USER_ID, theirCategory!.id)).toBe(false);
    expect(await categoryDeleteImpact(USER_ID, theirCategory!.id)).toBeNull();
    expect(await courseGrades(USER_ID, theirs.id)).toBeNull();

    const remaining = await prisma.gradeCategory.findMany({ where: { courseId: theirs.id } });
    expect(remaining.map((c) => c.name)).toEqual(["Exams"]);
  });

  it("deletes a Category together with its Grade Entries, leaving other Categories alone", async () => {
    const course = await newCourse(USER_ID, "Web Applications");
    const exams = await addCategory(USER_ID, course.id, { name: "Exams", weight: 40 });
    const labs = await addCategory(USER_ID, course.id, { name: "Labs", weight: 60 });
    await addEntry(USER_ID, course.id, entry(exams!.id, 1, 2));
    await addEntry(USER_ID, course.id, entry(exams!.id, 2, 2));
    await addEntry(USER_ID, course.id, entry(labs!.id, 3, 4));

    expect(await categoryDeleteImpact(USER_ID, exams!.id)).toEqual({ entries: 2 });
    expect(await deleteCategory(USER_ID, exams!.id)).toBe(true);

    expect(await prisma.gradeCategory.findUnique({ where: { id: exams!.id } })).toBeNull();
    expect(await prisma.gradeEntry.count({ where: { categoryId: exams!.id } })).toBe(0);
    expect(await prisma.gradeEntry.count({ where: { categoryId: labs!.id } })).toBe(1);
  });
});

describe("Grade Entries", () => {
  it("edits an entry, including moving it to another Category of the same Course", async () => {
    const course = await newCourse(USER_ID, "Web Applications");
    const exams = await addCategory(USER_ID, course.id, { name: "Exams", weight: 50 });
    const labs = await addCategory(USER_ID, course.id, { name: "Labs", weight: 50 });
    await addEntry(USER_ID, course.id, entry(exams!.id, 5, 10, "Quiz"));
    const created = await prisma.gradeEntry.findFirstOrThrow({ where: { courseId: course.id } });

    const moved = await updateEntry(USER_ID, created.id, {
      name: "Lab 1",
      categoryId: labs!.id,
      pointsEarned: 7.5,
      pointsPossible: 8,
      date: new Date("2026-10-14T00:00:00.000Z"),
    });

    expect(moved).toBe(true);
    const after = await prisma.gradeEntry.findUniqueOrThrow({ where: { id: created.id } });
    expect(after).toMatchObject({
      name: "Lab 1",
      categoryId: labs!.id,
      courseId: course.id,
      pointsEarned: 7.5,
      pointsPossible: 8,
    });
    expect(after.date?.toISOString()).toBe("2026-10-14T00:00:00.000Z");
  });

  it("refuses an entry whose Category belongs to a different Course", async () => {
    const course = await newCourse(USER_ID, "Web Applications");
    const otherCourse = await newCourse(USER_ID, "Networking");
    const mine = await addCategory(USER_ID, course.id, { name: "Exams", weight: 100 });
    const elsewhere = await addCategory(USER_ID, otherCourse.id, { name: "Exams", weight: 100 });

    expect(await addEntry(USER_ID, course.id, entry(elsewhere!.id, 1, 2))).toBe(false);

    await addEntry(USER_ID, course.id, entry(mine!.id, 1, 2));
    const created = await prisma.gradeEntry.findFirstOrThrow({ where: { courseId: course.id } });
    expect(await updateEntry(USER_ID, created.id, entry(elsewhere!.id, 1, 2))).toBe(false);
    expect(await prisma.gradeEntry.count({ where: { courseId: otherCourse.id } })).toBe(0);
  });

  it("refuses to add, edit or delete entries of another user's Course", async () => {
    const theirs = await newCourse(OTHER_USER_ID, "Not mine");
    const theirCategory = await addCategory(OTHER_USER_ID, theirs.id, { name: "Exams", weight: 100 });
    await addEntry(OTHER_USER_ID, theirs.id, entry(theirCategory!.id, 9, 10));
    const theirEntry = await prisma.gradeEntry.findFirstOrThrow({ where: { courseId: theirs.id } });

    expect(await addEntry(USER_ID, theirs.id, entry(theirCategory!.id, 1, 1))).toBe(false);
    expect(await updateEntry(USER_ID, theirEntry.id, entry(theirCategory!.id, 0, 10))).toBe(false);
    expect(await deleteEntry(USER_ID, theirEntry.id)).toBe(false);

    const after = await prisma.gradeEntry.findMany({ where: { courseId: theirs.id } });
    expect(after).toHaveLength(1);
    expect(after[0].pointsEarned).toBe(9);
  });

  it("deletes one entry", async () => {
    const course = await newCourse(USER_ID, "Web Applications");
    const exams = await addCategory(USER_ID, course.id, { name: "Exams", weight: 100 });
    await addEntry(USER_ID, course.id, entry(exams!.id, 1, 2, "A"));
    await addEntry(USER_ID, course.id, entry(exams!.id, 2, 2, "B"));
    const a = await prisma.gradeEntry.findFirstOrThrow({ where: { name: "A", courseId: course.id } });

    expect(await deleteEntry(USER_ID, a.id)).toBe(true);

    const left = await prisma.gradeEntry.findMany({ where: { courseId: course.id } });
    expect(left.map((e) => e.name)).toEqual(["B"]);
  });
});

describe("currentGradesByCourse", () => {
  it("gives each Course its Current Grade, or null with no entries, for this user only", async () => {
    const graded = await newCourse(USER_ID, "Graded");
    const empty = await newCourse(USER_ID, "Empty");
    const theirs = await newCourse(OTHER_USER_ID, "Theirs");
    const exams = await addCategory(USER_ID, graded.id, { name: "Exams", weight: 40 });
    const labs = await addCategory(USER_ID, graded.id, { name: "Labs", weight: 60 });
    await addCategory(USER_ID, empty.id, { name: "Exams", weight: 100 });
    const theirExams = await addCategory(OTHER_USER_ID, theirs.id, { name: "Exams", weight: 100 });
    await addEntry(USER_ID, graded.id, entry(exams!.id, 80, 100));
    await addEntry(USER_ID, graded.id, entry(labs!.id, 9, 10));
    await addEntry(OTHER_USER_ID, theirs.id, entry(theirExams!.id, 1, 10));

    const grades = await currentGradesByCourse(USER_ID);

    // 0.4 * 80% + 0.6 * 90% = 86
    expect(grades[graded.id]).toBeCloseTo(86, 10);
    expect(grades[empty.id]).toBeNull();
    expect(grades).not.toHaveProperty(theirs.id);
  });
});
