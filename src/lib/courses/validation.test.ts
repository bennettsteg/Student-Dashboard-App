import { describe, expect, it } from "vitest";

import { meetingSummary, parseCourseInput, type CourseInput } from "./validation";

const base: CourseInput = {
  name: "Web Applications",
  daysOfWeek: [2, 4],
  startTime: "09:30",
  endTime: "10:45",
};

function ok(input: CourseInput) {
  const parsed = parseCourseInput(input);
  if (!parsed.ok) throw new Error(`expected ok, got: ${parsed.error}`);
  return parsed.value;
}

function error(input: CourseInput) {
  const parsed = parseCourseInput(input);
  if (parsed.ok) throw new Error("expected an error");
  return parsed.error;
}

describe("parseCourseInput", () => {
  it("accepts a scheduled Course and trims the text fields", () => {
    expect(
      ok({ ...base, name: "  Web Applications ", code: " CS 201 ", instructor: " Dr. X ", location: " " }),
    ).toEqual({
      name: "Web Applications",
      code: "CS 201",
      instructor: "Dr. X",
      location: null,
      daysOfWeek: [2, 4],
      startTime: "09:30",
      endTime: "10:45",
    });
  });

  it("requires a name once trimmed", () => {
    expect(error({ ...base, name: "   " })).toMatch(/name/i);
  });

  it("allows an unscheduled Course: no days and no times", () => {
    const value = ok({ ...base, daysOfWeek: [], startTime: "", endTime: "" });
    expect(value).toMatchObject({ daysOfWeek: [], startTime: "", endTime: "" });
  });

  it("stores an unscheduled Course with empty times even if times were sent", () => {
    expect(ok({ ...base, daysOfWeek: [] })).toMatchObject({ startTime: "", endTime: "" });
  });

  it("requires valid times when days are chosen", () => {
    expect(error({ ...base, startTime: "", endTime: "" })).toMatch(/time/i);
    expect(error({ ...base, startTime: "9:30" })).toMatch(/time/i);
    expect(error({ ...base, endTime: "24:00" })).toMatch(/time/i);
  });

  it("requires the end time to be after the start time when days are chosen", () => {
    expect(error({ ...base, startTime: "10:45", endTime: "10:45" })).toMatch(/after/i);
    expect(error({ ...base, startTime: "11:00", endTime: "10:00" })).toMatch(/after/i);
  });

  it("only accepts weekdays 1 (Monday) to 5 (Friday)", () => {
    expect(error({ ...base, daysOfWeek: [0] })).toMatch(/day/i);
    expect(error({ ...base, daysOfWeek: [6] })).toMatch(/day/i);
    expect(error({ ...base, daysOfWeek: [1.5] })).toMatch(/day/i);
  });

  it("sorts days and drops duplicates", () => {
    expect(ok({ ...base, daysOfWeek: [4, 2, 4, 1] }).daysOfWeek).toEqual([1, 2, 4]);
  });
});

describe("meetingSummary", () => {
  it("lists the days and start time of a scheduled Course", () => {
    expect(meetingSummary([2, 4], "09:30")).toBe("Tue / Thu, 9:30 AM");
  });

  it("is null for an unscheduled Course", () => {
    expect(meetingSummary([], "")).toBeNull();
  });
});
