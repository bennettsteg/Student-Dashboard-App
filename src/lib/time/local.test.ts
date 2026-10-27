import { describe, expect, it } from "vitest";

import { formatDueDay, formatDueTime, localDate, localHour, localTimeOfDay } from "./local";

const UTC = "UTC";
const NY = "America/New_York";

describe("localDate", () => {
  it("is the calendar date the instant falls on in the timezone", () => {
    const instant = new Date("2026-10-28T02:00:00Z");
    expect(localDate(instant, UTC)).toBe("2026-10-28");
    expect(localDate(instant, NY)).toBe("2026-10-27");
  });
});

describe("localTimeOfDay", () => {
  it("formats the wall-clock time as zero-padded HH:mm", () => {
    expect(localTimeOfDay(new Date("2026-10-26T12:05:00Z"), NY)).toBe("08:05");
  });

  it("shows midnight as 00:00, never 24:00", () => {
    expect(localTimeOfDay(new Date("2026-10-26T04:00:00Z"), NY)).toBe("00:00");
  });
});

describe("localHour", () => {
  it("is the 0-23 hour in the timezone", () => {
    expect(localHour(new Date("2026-10-26T15:00:00Z"), NY)).toBe(11);
    expect(localHour(new Date("2026-10-26T04:30:00Z"), NY)).toBe(0);
  });
});

describe("formatDueDay", () => {
  it("is the short weekday, month and day in the student's timezone", () => {
    expect(formatDueDay(new Date("2026-10-27T23:59:00Z"), UTC)).toBe("Tue, Oct 27");
    expect(formatDueDay(new Date("2026-10-28T02:00:00Z"), NY)).toBe("Tue, Oct 27");
  });
});

describe("formatDueTime", () => {
  it("is the 12-hour time in the student's timezone", () => {
    expect(formatDueTime(new Date("2026-10-28T03:59:00Z"), NY)).toBe("11:59 PM");
    expect(formatDueTime(new Date("2026-10-28T09:05:00Z"), UTC)).toBe("9:05 AM");
  });
});
