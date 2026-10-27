import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";

import { getProfile, updateProfile } from "./profile";
import type { ProfileInput } from "./validation";

// Live-database tests (needs a reachable DATABASE_URL): a dedicated user is created in setup
// and deleted in teardown, so nothing else's data is touched.

const USER_ID = `profile-test-${process.pid}-${Date.now()}`;
const EMAIL = `${USER_ID}@example.edu`;

const input: ProfileInput = {
  name: "Ada Lovelace",
  program: "Computer Science",
  termLabel: "Fall 2026",
  timezone: "America/Chicago",
  reminderTime: "07:30",
  remindersEnabled: true,
};

beforeAll(async () => {
  await prisma.user.create({ data: { id: USER_ID, email: EMAIL } });
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: USER_ID } });
  await prisma.$disconnect();
});

describe("profile", () => {
  it("starts with reminders off, 08:00 and UTC, and the connected account's email", async () => {
    expect(await getProfile(USER_ID)).toEqual({
      name: null,
      email: EMAIL,
      program: null,
      termLabel: null,
      timezone: "UTC",
      reminderTime: "08:00",
      remindersEnabled: false,
    });
  });

  it("saves the profile and reminder preferences so a later read returns them", async () => {
    const result = await updateProfile(USER_ID, input);

    expect(result).toEqual({ ok: true });
    expect(await getProfile(USER_ID)).toEqual({ ...input, email: EMAIL });
  });

  it("turns reminders off without losing the chosen time or timezone", async () => {
    await updateProfile(USER_ID, input);

    await updateProfile(USER_ID, { ...input, remindersEnabled: false });

    expect(await getProfile(USER_ID)).toMatchObject({
      remindersEnabled: false,
      reminderTime: "07:30",
      timezone: "America/Chicago",
    });
  });

  it("clears Program and Term when they are submitted blank", async () => {
    await updateProfile(USER_ID, input);

    await updateProfile(USER_ID, { ...input, program: "  ", termLabel: "" });

    expect(await getProfile(USER_ID)).toMatchObject({ program: null, termLabel: null });
  });

  it("refuses an invalid timezone and leaves the saved profile unchanged", async () => {
    await updateProfile(USER_ID, input);

    const result = await updateProfile(USER_ID, { ...input, timezone: "Mars/Phobos", name: "Nope" });

    expect(result).toEqual({ ok: false, error: "Choose a valid timezone." });
    expect(await getProfile(USER_ID)).toEqual({ ...input, email: EMAIL });
  });

  it("never changes the email, which belongs to the connected account", async () => {
    await updateProfile(USER_ID, input);

    expect((await getProfile(USER_ID)).email).toBe(EMAIL);
  });
});
