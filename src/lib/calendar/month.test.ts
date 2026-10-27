import { describe, expect, it } from "vitest";

import { groupByDueDay, monthGrid, monthOf, shiftMonth } from "./month";

describe("monthGrid", () => {
  it("lays October 2026 out as five Sunday-first weeks, padded with blanks", () => {
    // 1 Oct 2026 is a Thursday; 31 Oct is a Saturday.
    const weeks = monthGrid({ year: 2026, month: 10 });
    expect(weeks).toHaveLength(5);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[0].map((cell) => cell?.day ?? null)).toEqual([null, null, null, null, 1, 2, 3]);
    expect(weeks[0][4]?.key).toBe("2026-10-01");
    expect(weeks[4].map((cell) => cell?.day ?? null)).toEqual([25, 26, 27, 28, 29, 30, 31]);
  });

  it("needs only four weeks when February starts on a Sunday", () => {
    // 1 Feb 2026 is a Sunday and the month has 28 days.
    expect(monthGrid({ year: 2026, month: 2 })).toHaveLength(4);
  });

  it("needs six weeks when a 31-day month starts on a Saturday", () => {
    // 1 Aug 2026 is a Saturday.
    const weeks = monthGrid({ year: 2026, month: 8 });
    expect(weeks).toHaveLength(6);
    expect(weeks[5].map((cell) => cell?.day ?? null)).toEqual([30, 31, null, null, null, null, null]);
  });

  it("handles leap-year February", () => {
    const days = monthGrid({ year: 2028, month: 2 })
      .flat()
      .filter((cell) => cell !== null);
    expect(days).toHaveLength(29);
    expect(days.at(-1)?.key).toBe("2028-02-29");
  });
});

describe("shiftMonth and monthOf", () => {
  it("rolls over year boundaries", () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth({ year: 2026, month: 10 }, 0)).toEqual({ year: 2026, month: 10 });
  });

  it("reads the month an instant falls in for the given timezone", () => {
    // 03:00 UTC on 1 Nov is still the evening of 31 Oct in New York.
    const instant = new Date("2026-11-01T03:00:00Z");
    expect(monthOf(instant, "UTC")).toEqual({ year: 2026, month: 11 });
    expect(monthOf(instant, "America/New_York")).toEqual({ year: 2026, month: 10 });
  });
});

describe("groupByDueDay", () => {
  const item = (id: string, dueAt: string) => ({ id, dueAt: new Date(dueAt) });

  it("groups by the local calendar day, soonest first within a day", () => {
    const grouped = groupByDueDay(
      [
        item("late", "2026-10-27T22:00:00Z"),
        item("other-day", "2026-10-29T12:00:00Z"),
        item("early", "2026-10-27T08:00:00Z"),
      ],
      "UTC",
    );
    expect(grouped.get("2026-10-27")?.map((a) => a.id)).toEqual(["early", "late"]);
    expect(grouped.get("2026-10-29")?.map((a) => a.id)).toEqual(["other-day"]);
    expect(grouped.size).toBe(2);
  });

  it("puts an 11:59 PM New York deadline on its own local day, not the UTC day", () => {
    // 11:59 PM EDT on 27 Oct is 03:59 UTC on 28 Oct.
    const due = item("a", "2026-10-28T03:59:00Z");
    expect(groupByDueDay([due], "America/New_York").has("2026-10-27")).toBe(true);
    expect(groupByDueDay([due], "UTC").has("2026-10-28")).toBe(true);
  });
});
