import { describe, expect, it } from "vitest";

import { formatDueDay, formatHeaderDate, greeting } from "./greeting";

const UTC = "UTC";
const NY = "America/New_York";

describe("greeting", () => {
  it("says good morning before noon, afternoon until 6 PM, evening after", () => {
    expect(greeting(new Date("2026-10-26T08:00:00Z"), UTC, "Sam")).toBe("Good morning, Sam");
    expect(greeting(new Date("2026-10-26T11:59:00Z"), UTC, "Sam")).toBe("Good morning, Sam");
    expect(greeting(new Date("2026-10-26T12:00:00Z"), UTC, "Sam")).toBe("Good afternoon, Sam");
    expect(greeting(new Date("2026-10-26T17:59:00Z"), UTC, "Sam")).toBe("Good afternoon, Sam");
    expect(greeting(new Date("2026-10-26T18:00:00Z"), UTC, "Sam")).toBe("Good evening, Sam");
  });

  it("uses the hour in the student's timezone", () => {
    // 15:00Z is 11:00 in New York (EDT, UTC-4).
    expect(greeting(new Date("2026-10-26T15:00:00Z"), NY, "Sam")).toBe("Good morning, Sam");
  });

  it("treats midnight as morning", () => {
    expect(greeting(new Date("2026-10-26T00:30:00Z"), UTC, "Sam")).toBe("Good morning, Sam");
  });

  it("drops the name when the profile has none", () => {
    expect(greeting(new Date("2026-10-26T15:00:00Z"), UTC, null)).toBe("Good afternoon");
    expect(greeting(new Date("2026-10-26T15:00:00Z"), UTC, "  ")).toBe("Good afternoon");
  });
});

describe("formatHeaderDate", () => {
  it("shows the local weekday and date, then the Term label", () => {
    expect(formatHeaderDate(new Date("2026-10-26T12:00:00Z"), UTC, "Fall semester")).toBe(
      "Monday, October 26 · Fall semester",
    );
  });

  it("uses the local date, not the UTC one", () => {
    expect(formatHeaderDate(new Date("2026-10-27T02:00:00Z"), NY, "Fall semester")).toBe(
      "Monday, October 26 · Fall semester",
    );
  });

  it("is just the date when there is no Term label", () => {
    expect(formatHeaderDate(new Date("2026-10-26T12:00:00Z"), UTC, null)).toBe("Monday, October 26");
    expect(formatHeaderDate(new Date("2026-10-26T12:00:00Z"), UTC, "")).toBe("Monday, October 26");
  });
});

describe("formatDueDay", () => {
  it("is the short weekday, month and day in the student's timezone", () => {
    expect(formatDueDay(new Date("2026-10-27T23:59:00Z"), UTC)).toBe("Tue, Oct 27");
    expect(formatDueDay(new Date("2026-10-28T02:00:00Z"), NY)).toBe("Tue, Oct 27");
  });
});
