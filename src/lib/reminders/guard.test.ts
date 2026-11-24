import { describe, expect, it } from "vitest";

import { reminderDue, type ReminderGuardInput } from "./guard";

const NY = "America/New_York";

// 2026-10-26 is a Monday; New York is on EDT (UTC-4) until 2026-11-01.
const base: ReminderGuardInput = {
  remindersEnabled: true,
  reminderTime: "08:00",
  timeZone: NY,
  lastSentLocalDate: null,
  dueTodayCount: 2,
  now: new Date("2026-10-26T12:00:00Z"), // 08:00 in New York
};

const due = (overrides: Partial<ReminderGuardInput> = {}) => reminderDue({ ...base, ...overrides });

describe("reminderDue", () => {
  it("is not due a minute before the reminder time", () => {
    expect(due({ now: new Date("2026-10-26T11:59:00Z") })).toBe(false);
  });

  it("is due exactly at the reminder time", () => {
    expect(due({ now: new Date("2026-10-26T12:00:00Z") })).toBe(true);
  });

  it("is still due long after the reminder time, so a late tick or a restart catches up", () => {
    expect(due({ now: new Date("2026-10-27T02:00:00Z") })).toBe(true); // 22:00 local
  });

  it("is not due when a Reminder was already sent today (local date)", () => {
    expect(due({ lastSentLocalDate: "2026-10-26" })).toBe(false);
  });

  it("is due again on the next local day", () => {
    expect(due({ lastSentLocalDate: "2026-10-25" })).toBe(true);
  });

  it("waits 15 minutes after a failed attempt, then is due again", () => {
    const failed = new Date("2026-10-26T12:00:00Z");
    expect(due({ lastFailedAt: failed, now: new Date("2026-10-26T12:14:59Z") })).toBe(false);
    expect(due({ lastFailedAt: failed, now: new Date("2026-10-26T12:15:00Z") })).toBe(true);
  });

  it("is not due when nothing is due today", () => {
    expect(due({ dueTodayCount: 0 })).toBe(false);
  });

  it("is not due when reminders are disabled", () => {
    expect(due({ remindersEnabled: false })).toBe(false);
  });

  it("reads the reminder time in the user's timezone, not UTC", () => {
    // 07:30 in New York is already 11:30 UTC, yet before an 08:00 local reminder.
    expect(due({ now: new Date("2026-10-26T11:30:00Z") })).toBe(false);
    // In UTC the same instant is past 08:00, so only the timezone makes the difference.
    expect(due({ timeZone: "UTC", now: new Date("2026-10-26T11:30:00Z") })).toBe(true);
  });

  it("uses the local date, not the UTC date, for 'already sent today'", () => {
    // 23:30 local on Oct 26 is already Oct 27 in UTC.
    const now = new Date("2026-10-27T03:30:00Z");
    expect(due({ now, lastSentLocalDate: "2026-10-26" })).toBe(false);
    expect(due({ now, lastSentLocalDate: "2026-10-27" })).toBe(true);
  });

  it("fires on a spring-forward day when the reminder time is skipped", () => {
    // 2027-03-14: 02:00 jumps to 03:00 in New York, so 02:30 never occurs.
    const input = { reminderTime: "02:30", timeZone: NY } as const;
    expect(due({ ...input, now: new Date("2027-03-14T06:59:00Z") })).toBe(false); // 01:59 EST
    expect(due({ ...input, now: new Date("2027-03-14T07:00:00Z") })).toBe(true); // 03:00 EDT
  });
});
