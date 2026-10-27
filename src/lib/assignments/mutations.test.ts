import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";

import { completeAssignment, createAssignment, updateAssignment } from "./mutations";

// Live-database tests (needs a reachable DATABASE_URL): two dedicated users, each with a
// Course, are created in setup and deleted in teardown, which cascades to their Courses and
// Assignments.

const STAMP = `${process.pid}-${Date.now()}`;
const ME = `assignments-test-me-${STAMP}`;
const OTHER = `assignments-test-other-${STAMP}`;
let myCourse: string;
let myOtherCourse: string;
let theirCourse: string;

const due = "2026-10-30T03:59:00.000Z";

beforeAll(async () => {
  await prisma.user.create({ data: { id: ME } });
  await prisma.user.create({ data: { id: OTHER } });
  myCourse = (await prisma.course.create({ data: { userId: ME, name: "Web Applications", daysOfWeek: [1], startTime: "09:00", endTime: "10:00" } })).id;
  myOtherCourse = (await prisma.course.create({ data: { userId: ME, name: "Databases", daysOfWeek: [1], startTime: "09:00", endTime: "10:00" } })).id;
  theirCourse = (await prisma.course.create({ data: { userId: OTHER, name: "Theirs", daysOfWeek: [1], startTime: "09:00", endTime: "10:00" } })).id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [ME, OTHER] } } });
});

describe("createAssignment", () => {
  it("stores an Assignment under one of the student's own Courses", async () => {
    const id = await createAssignment(ME, {
      title: "  Responsive layout lab ",
      courseId: myCourse,
      dueAt: due,
      notes: "Bring laptop",
    });

    const saved = await prisma.assignment.findUniqueOrThrow({ where: { id } });
    expect(saved).toMatchObject({
      userId: ME,
      courseId: myCourse,
      title: "Responsive layout lab",
      notes: "Bring laptop",
    });
    expect(saved.dueAt.toISOString()).toBe(due);
  });

  it("refuses a Course the student does not own, and a missing one", async () => {
    await expect(
      createAssignment(ME, { title: "Sneaky", courseId: theirCourse, dueAt: due }),
    ).rejects.toThrow(/course/i);
    await expect(
      createAssignment(ME, { title: "Orphan", courseId: "", dueAt: due }),
    ).rejects.toThrow(/course/i);
    expect(await prisma.assignment.count({ where: { title: { in: ["Sneaky", "Orphan"] } } })).toBe(0);
  });

  it("refuses a blank title", async () => {
    await expect(
      createAssignment(ME, { title: "   ", courseId: myCourse, dueAt: due }),
    ).rejects.toThrow(/title/i);
  });
});

describe("updateAssignment", () => {
  it("changes the title, Course, due time and notes", async () => {
    const id = await createAssignment(ME, { title: "Draft", courseId: myCourse, dueAt: due });

    await updateAssignment(ME, id, {
      title: "Final",
      courseId: myOtherCourse,
      dueAt: "2026-11-02T04:59:00.000Z",
      notes: null,
    });

    const saved = await prisma.assignment.findUniqueOrThrow({ where: { id } });
    expect(saved).toMatchObject({ title: "Final", courseId: myOtherCourse, notes: null });
    expect(saved.dueAt.toISOString()).toBe("2026-11-02T04:59:00.000Z");
  });

  it("cannot move an Assignment into another student's Course", async () => {
    const id = await createAssignment(ME, { title: "Stay", courseId: myCourse, dueAt: due });
    await expect(
      updateAssignment(ME, id, { title: "Stay", courseId: theirCourse, dueAt: due }),
    ).rejects.toThrow(/course/i);
    expect((await prisma.assignment.findUniqueOrThrow({ where: { id } })).courseId).toBe(myCourse);
  });

  it("leaves another student's Assignment alone", async () => {
    const theirs = await prisma.assignment.create({
      data: { userId: OTHER, courseId: theirCourse, title: "Theirs", dueAt: new Date(due) },
    });
    await updateAssignment(ME, theirs.id, { title: "Hacked", courseId: myCourse, dueAt: due });
    expect((await prisma.assignment.findUniqueOrThrow({ where: { id: theirs.id } })).title).toBe(
      "Theirs",
    );
  });
});

describe("completeAssignment", () => {
  it("permanently deletes the Assignment", async () => {
    const id = await createAssignment(ME, { title: "Done soon", courseId: myCourse, dueAt: due });
    await completeAssignment(ME, id);
    expect(await prisma.assignment.findUnique({ where: { id } })).toBeNull();
  });

  it("does not delete another student's Assignment", async () => {
    const theirs = await prisma.assignment.create({
      data: { userId: OTHER, courseId: theirCourse, title: "Theirs 2", dueAt: new Date(due) },
    });
    await completeAssignment(ME, theirs.id);
    expect(await prisma.assignment.findUnique({ where: { id: theirs.id } })).not.toBeNull();
  });
});
