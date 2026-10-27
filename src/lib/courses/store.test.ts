import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";

import { createCourse, updateCourse } from "./store";
import type { CourseInput } from "./validation";

// Live-database tests (needs a reachable DATABASE_URL): dedicated users are created in setup
// and deleted in teardown, which cascades to everything the tests create.

const USER_ID = `course-store-test-${process.pid}-${Date.now()}`;
const OTHER_USER_ID = `course-store-other-${process.pid}-${Date.now()}`;

const input: CourseInput = {
  name: "Web Applications",
  code: "CS 201",
  instructor: "Dr. Example",
  location: "Room 1",
  daysOfWeek: [2, 4],
  startTime: "09:30",
  endTime: "10:45",
};

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

describe("createCourse", () => {
  it("saves a validated Course for the user and gives it a colour", async () => {
    const result = await createCourse(USER_ID, { ...input, name: "  Web Applications  " });

    expect(result).toEqual({ ok: true });
    const saved = await prisma.course.findFirstOrThrow({ where: { userId: USER_ID } });
    expect(saved).toMatchObject({
      name: "Web Applications",
      code: "CS 201",
      daysOfWeek: [2, 4],
      startTime: "09:30",
      endTime: "10:45",
    });
    expect(saved.color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("gives successive Courses different colours", async () => {
    await createCourse(USER_ID, input);
    await createCourse(USER_ID, { ...input, name: "Networking" });

    const colors = (await prisma.course.findMany({ where: { userId: USER_ID } })).map((c) => c.color);
    expect(new Set(colors).size).toBe(2);
  });

  it("writes nothing and reports the error for invalid input", async () => {
    const result = await createCourse(USER_ID, { ...input, name: "  " });

    expect(result.ok).toBe(false);
    expect(await prisma.course.count({ where: { userId: USER_ID } })).toBe(0);
  });

  it("saves an unscheduled Course", async () => {
    const result = await createCourse(USER_ID, {
      name: "Reading group",
      daysOfWeek: [],
      startTime: "",
      endTime: "",
    });

    expect(result).toEqual({ ok: true });
    const saved = await prisma.course.findFirstOrThrow({ where: { userId: USER_ID } });
    expect(saved).toMatchObject({ daysOfWeek: [], startTime: "", endTime: "" });
  });
});

describe("updateCourse", () => {
  it("renames the migrated, unscheduled Course without asking for days or times", async () => {
    const migrated = await prisma.course.create({
      data: { userId: USER_ID, name: "Unassigned (migrated)", daysOfWeek: [], startTime: "", endTime: "" },
    });

    const result = await updateCourse(USER_ID, migrated.id, {
      name: "Databases",
      daysOfWeek: [],
      startTime: "",
      endTime: "",
    });

    expect(result).toEqual({ ok: true });
    const saved = await prisma.course.findUniqueOrThrow({ where: { id: migrated.id } });
    expect(saved.name).toBe("Databases");
  });

  it("rejects invalid input and leaves the Course as it was", async () => {
    await createCourse(USER_ID, input);
    const course = await prisma.course.findFirstOrThrow({ where: { userId: USER_ID } });

    const result = await updateCourse(USER_ID, course.id, {
      ...input,
      startTime: "11:00",
      endTime: "10:00",
    });

    expect(result.ok).toBe(false);
    expect(await prisma.course.findUniqueOrThrow({ where: { id: course.id } })).toMatchObject({
      startTime: "09:30",
      endTime: "10:45",
    });
  });

  it("does not touch another user's Course", async () => {
    await createCourse(OTHER_USER_ID, input);
    const theirs = await prisma.course.findFirstOrThrow({ where: { userId: OTHER_USER_ID } });

    const result = await updateCourse(USER_ID, theirs.id, { ...input, name: "Hijacked" });

    expect(result.ok).toBe(false);
    expect((await prisma.course.findUniqueOrThrow({ where: { id: theirs.id } })).name).toBe(
      "Web Applications",
    );
  });
});
