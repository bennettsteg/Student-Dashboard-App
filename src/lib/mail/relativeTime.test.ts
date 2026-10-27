import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "./relativeTime";

// Local-time constructors so the expectations hold in any server timezone.
// 2026-10-26 is a Monday.
const now = new Date(2026, 9, 26, 12, 0, 0);

describe("formatRelativeTime", () => {
  it("says 'Just now' within the first minute", () => {
    expect(formatRelativeTime(new Date(2026, 9, 26, 11, 59, 30), now)).toBe("Just now");
  });

  it("counts minutes under an hour", () => {
    expect(formatRelativeTime(new Date(2026, 9, 26, 11, 55, 0), now)).toBe("5 minutes ago");
    expect(formatRelativeTime(new Date(2026, 9, 26, 11, 59, 0), now)).toBe("1 minute ago");
  });

  it("counts hours earlier the same day", () => {
    expect(formatRelativeTime(new Date(2026, 9, 26, 10, 0, 0), now)).toBe("2 hours ago");
    expect(formatRelativeTime(new Date(2026, 9, 26, 11, 0, 0), now)).toBe("1 hour ago");
  });

  it("says 'Yesterday' for any time on the previous calendar day", () => {
    expect(formatRelativeTime(new Date(2026, 9, 25, 23, 59, 0), now)).toBe("Yesterday");
    expect(formatRelativeTime(new Date(2026, 9, 25, 0, 1, 0), now)).toBe("Yesterday");
  });

  it("uses the weekday name for the rest of the past week", () => {
    expect(formatRelativeTime(new Date(2026, 9, 24, 9, 0, 0), now)).toBe("Sat");
    expect(formatRelativeTime(new Date(2026, 9, 20, 9, 0, 0), now)).toBe("Tue");
  });

  it("uses the month and day from a week ago onwards", () => {
    expect(formatRelativeTime(new Date(2026, 9, 19, 9, 0, 0), now)).toBe("Oct 19");
    expect(formatRelativeTime(new Date(2026, 8, 3, 9, 0, 0), now)).toBe("Sep 3");
  });

  it("includes the year for a different year", () => {
    expect(formatRelativeTime(new Date(2025, 11, 31, 9, 0, 0), now)).toBe("Dec 31, 2025");
  });

  it("treats a time slightly in the future (clock skew) as just now", () => {
    expect(formatRelativeTime(new Date(2026, 9, 26, 12, 0, 20), now)).toBe("Just now");
  });
});
