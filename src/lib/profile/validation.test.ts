import { describe, expect, it } from "vitest";

import { isValidTimeOfDay, isValidTimeZone, parseProfileInput } from "./validation";

describe("isValidTimeZone", () => {
  it.each(["America/New_York", "Europe/London", "Asia/Kolkata", "UTC"])(
    "accepts the IANA name %s",
    (name) => {
      expect(isValidTimeZone(name)).toBe(true);
    },
  );

  it.each(["", "   ", "Mars/Phobos", "Not A Zone", "+05:00", "-08:00", "EST5EDT garbage"])(
    "rejects %j",
    (name) => {
      expect(isValidTimeZone(name)).toBe(false);
    },
  );
});

describe("isValidTimeOfDay", () => {
  it.each(["00:00", "08:00", "07:05", "23:59"])("accepts %s", (value) => {
    expect(isValidTimeOfDay(value)).toBe(true);
  });

  it.each(["", "8:00", "24:00", "12:60", "12:5", "12:00:00", "ab:cd", "1200"])(
    "rejects %j",
    (value) => {
      expect(isValidTimeOfDay(value)).toBe(false);
    },
  );
});

const valid = {
  name: "Ada Lovelace",
  program: "Computer Science",
  termLabel: "Fall 2026",
  timezone: "America/Chicago",
  reminderTime: "07:30",
  remindersEnabled: true,
};

describe("parseProfileInput", () => {
  it("accepts a complete valid profile", () => {
    expect(parseProfileInput(valid)).toEqual({ ok: true, value: valid });
  });

  it("trims text fields and stores blank ones as null", () => {
    const result = parseProfileInput({
      ...valid,
      name: "  Ada  ",
      program: "   ",
      termLabel: "",
    });

    expect(result).toEqual({
      ok: true,
      value: { ...valid, name: "Ada", program: null, termLabel: null },
    });
  });

  it("rejects an unknown timezone and says which field is wrong", () => {
    const result = parseProfileInput({ ...valid, timezone: "Mars/Phobos" });

    expect(result).toEqual({ ok: false, error: "Choose a valid timezone." });
  });

  it("rejects a malformed reminder time", () => {
    const result = parseProfileInput({ ...valid, reminderTime: "25:00" });

    expect(result).toEqual({ ok: false, error: "Enter the reminder time as HH:mm (00:00-23:59)." });
  });

  it("rejects over-long text instead of storing it", () => {
    const result = parseProfileInput({ ...valid, name: "x".repeat(101) });

    expect(result).toEqual({ ok: false, error: "Name must be 100 characters or fewer." });
  });
});
