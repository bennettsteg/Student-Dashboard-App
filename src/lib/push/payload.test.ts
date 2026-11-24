import { describe, expect, it } from "vitest";

import {
  buildLastChanceReminderPayload,
  buildMorningReminderPayload,
  buildTestPayload,
} from "./payload";

describe("Morning Reminder push payload", () => {
  it("is count-only: one Assignment due today", () => {
    expect(buildMorningReminderPayload(1)).toEqual({
      title: "StudyDesk",
      body: "1 assignment due today",
      url: "/assignments",
    });
  });

  it("pluralises for several Assignments", () => {
    expect(buildMorningReminderPayload(3).body).toBe("3 assignments due today");
  });

  it("opens Assignments when tapped", () => {
    expect(buildMorningReminderPayload(2).url).toBe("/assignments");
  });

  it("never builds a Reminder for nothing due today", () => {
    expect(() => buildMorningReminderPayload(0)).toThrow();
    expect(() => buildMorningReminderPayload(-1)).toThrow();
    expect(() => buildMorningReminderPayload(1.5)).toThrow();
  });
});

describe("Last-chance Reminder push payload", () => {
  it("is count-only, prefixed to distinguish it from the Morning Reminder", () => {
    expect(buildLastChanceReminderPayload(1)).toEqual({
      title: "StudyDesk",
      body: "Last chance: 1 assignment due today",
      url: "/assignments",
    });
  });

  it("pluralises for several Assignments", () => {
    expect(buildLastChanceReminderPayload(3).body).toBe("Last chance: 3 assignments due today");
  });

  it("opens Assignments when tapped", () => {
    expect(buildLastChanceReminderPayload(2).url).toBe("/assignments");
  });

  it("never builds a Reminder for nothing due today", () => {
    expect(() => buildLastChanceReminderPayload(0)).toThrow();
    expect(() => buildLastChanceReminderPayload(-1)).toThrow();
    expect(() => buildLastChanceReminderPayload(1.5)).toThrow();
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
