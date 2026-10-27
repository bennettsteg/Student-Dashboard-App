import { describe, expect, it } from "vitest";

import { buildReminderPayload, buildTestPayload } from "./payload";

describe("Reminder push payload", () => {
  it("is count-only: one Assignment due today", () => {
    expect(buildReminderPayload(1)).toEqual({
      title: "StudyDesk",
      body: "1 assignment due today",
      url: "/assignments",
    });
  });

  it("pluralises for several Assignments", () => {
    expect(buildReminderPayload(3).body).toBe("3 assignments due today");
  });

  it("opens Assignments when tapped", () => {
    expect(buildReminderPayload(2).url).toBe("/assignments");
  });

  it("never builds a Reminder for nothing due today", () => {
    expect(() => buildReminderPayload(0)).toThrow();
    expect(() => buildReminderPayload(-1)).toThrow();
    expect(() => buildReminderPayload(1.5)).toThrow();
  });
});

describe("test push payload", () => {
  it("confirms reminders work and also opens Assignments", () => {
    expect(buildTestPayload()).toEqual({
      title: "StudyDesk",
      body: "Test reminder: this device will get your daily Reminders.",
      url: "/assignments",
    });
  });
});
