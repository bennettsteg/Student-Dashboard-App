import { describe, expect, it } from "vitest";

import { zonedTimeToInstant } from "./zoned";

const NY = "America/New_York";

function iso(day: string, time: string, timeZone: string): string {
  return zonedTimeToInstant(day, time, timeZone).toISOString();
}

describe("zonedTimeToInstant", () => {
  it("reads the wall-clock time in UTC as itself", () => {
    expect(iso("2026-10-27", "23:59", "UTC")).toBe("2026-10-27T23:59:00.000Z");
  });

  it("applies the daylight-time offset in summer or early autumn", () => {
    // New York is UTC-4 (EDT) until 2026-11-01.
    expect(iso("2026-10-27", "23:59", NY)).toBe("2026-10-28T03:59:00.000Z");
  });

  it("applies the standard-time offset after the autumn change", () => {
    expect(iso("2026-11-02", "23:59", NY)).toBe("2026-11-03T04:59:00.000Z");
  });

  it("handles zones east of UTC, where the instant is on the previous UTC day", () => {
    expect(iso("2026-10-27", "00:30", "Asia/Tokyo")).toBe("2026-10-26T15:30:00.000Z");
  });

  it("handles half-hour offsets", () => {
    expect(iso("2026-10-27", "12:00", "Asia/Kolkata")).toBe("2026-10-27T06:30:00.000Z");
  });

  it("takes the first occurrence of a wall-clock time repeated by the autumn change", () => {
    // 2026-11-01 01:30 happens twice in New York; the first is still EDT (05:30Z).
    expect(iso("2026-11-01", "01:30", NY)).toBe("2026-11-01T05:30:00.000Z");
  });

  it("moves a wall-clock time skipped by the spring change forward by the gap", () => {
    // 2027-03-14 02:30 never occurs in New York; it resolves to 03:30 EDT (07:30Z).
    expect(iso("2027-03-14", "02:30", NY)).toBe("2027-03-14T07:30:00.000Z");
  });

  it("rejects malformed days and times", () => {
    expect(() => zonedTimeToInstant("10/27/2026", "23:59", NY)).toThrow(RangeError);
    expect(() => zonedTimeToInstant("2026-10-27", "25:00", NY)).toThrow(RangeError);
    expect(() => zonedTimeToInstant("2026-10-27", "", NY)).toThrow(RangeError);
  });
});
