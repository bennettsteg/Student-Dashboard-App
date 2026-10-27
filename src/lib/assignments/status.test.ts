import { describe, expect, it } from "vitest";

import { assignmentStatus, isDueToday } from "./status";

const NY = "America/New_York";
const UTC = "UTC";

describe("assignmentStatus", () => {
  it("is Overdue once the due instant has passed", () => {
    const now = new Date("2026-03-10T15:00:00Z");
    expect(assignmentStatus(new Date("2026-03-10T14:59:59Z"), now, UTC)).toBe("overdue");
  });

  it("is not Overdue at the exact due instant", () => {
    const now = new Date("2026-03-10T15:00:00Z");
    expect(assignmentStatus(now, now, UTC)).toBe("due-today");
  });

  it("is Due today when later on the same local day", () => {
    const now = new Date("2026-03-10T09:00:00Z");
    expect(assignmentStatus(new Date("2026-03-10T23:59:00Z"), now, UTC)).toBe("due-today");
  });

  it("is Due soon the next local day, even a minute after midnight", () => {
    const now = new Date("2026-03-10T23:59:00Z");
    expect(assignmentStatus(new Date("2026-03-11T00:01:00Z"), now, UTC)).toBe("due-soon");
  });

  it("is Due soon when due exactly 7 days from now", () => {
    const now = new Date("2026-03-10T12:00:00Z");
    expect(assignmentStatus(new Date("2026-03-17T12:00:00Z"), now, UTC)).toBe("due-soon");
  });

  it("is Upcoming when due a millisecond more than 7 days from now", () => {
    const now = new Date("2026-03-10T12:00:00Z");
    expect(assignmentStatus(new Date("2026-03-17T12:00:00.001Z"), now, UTC)).toBe("upcoming");
  });

  it("is Upcoming when due well beyond a week", () => {
    const now = new Date("2026-03-10T12:00:00Z");
    expect(assignmentStatus(new Date("2026-04-30T12:00:00Z"), now, UTC)).toBe("upcoming");
  });

  describe("timezone shifts", () => {
    it("treats 11:59 PM New York time as Due today even though it is already tomorrow in UTC", () => {
      // 2026-03-10 22:00 EDT (UTC-4) = 2026-03-11 02:00 UTC
      const now = new Date("2026-03-11T02:00:00Z");
      const due = new Date("2026-03-11T03:59:00Z"); // 23:59 EDT on 2026-03-10
      expect(assignmentStatus(due, now, NY)).toBe("due-today");
      expect(assignmentStatus(due, now, UTC)).toBe("due-today");
    });

    it("draws the same instants on different days in different timezones", () => {
      const now = new Date("2026-03-10T12:00:00Z"); // 08:00 EDT, 12:00 UTC
      const due = new Date("2026-03-11T02:00:00Z"); // 22:00 EDT same day, 02:00 UTC next day
      expect(assignmentStatus(due, now, NY)).toBe("due-today");
      expect(assignmentStatus(due, now, UTC)).toBe("due-soon");
    });

    it("rolls over local midnight in the user's timezone, not the server's", () => {
      const due = new Date("2026-03-11T04:30:00Z"); // 00:30 EDT on 03-11
      expect(assignmentStatus(due, new Date("2026-03-11T03:30:00Z"), NY)).toBe("due-soon"); // 23:30 EDT 03-10
      expect(assignmentStatus(due, new Date("2026-03-11T04:10:00Z"), NY)).toBe("due-today"); // 00:10 EDT 03-11
    });

    it("handles the daylight saving spring-forward day", () => {
      // US clocks jump 02:00 -> 03:00 on 2026-03-08.
      const now = new Date("2026-03-08T06:30:00Z"); // 01:30 EST
      const due = new Date("2026-03-09T03:59:00Z"); // 23:59 EDT on 03-08
      expect(assignmentStatus(due, now, NY)).toBe("due-today");
    });
  });
});

describe("isDueToday", () => {
  it("is true on the same local date and false on neighbouring dates", () => {
    const now = new Date("2026-03-10T15:00:00Z");
    expect(isDueToday(new Date("2026-03-10T00:00:00Z"), now, UTC)).toBe(true);
    expect(isDueToday(new Date("2026-03-10T23:59:59Z"), now, UTC)).toBe(true);
    expect(isDueToday(new Date("2026-03-09T23:59:59Z"), now, UTC)).toBe(false);
    expect(isDueToday(new Date("2026-03-11T00:00:00Z"), now, UTC)).toBe(false);
  });

  it("includes assignments already past due earlier the same local day", () => {
    const now = new Date("2026-03-10T15:00:00Z");
    expect(isDueToday(new Date("2026-03-10T08:00:00Z"), now, UTC)).toBe(true);
  });

  it("uses the given timezone for the local date", () => {
    const now = new Date("2026-03-10T03:00:00Z"); // 23:00 EDT on 03-09
    expect(isDueToday(new Date("2026-03-10T01:00:00Z"), now, NY)).toBe(true); // 21:00 EDT 03-09
    expect(isDueToday(new Date("2026-03-10T05:00:00Z"), now, NY)).toBe(false); // 01:00 EDT 03-10
  });
});
