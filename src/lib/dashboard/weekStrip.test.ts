import { describe, expect, it } from "vitest";

import { weekStrip } from "./summary";

const UTC = "UTC";
const NY = "America/New_York";

const due = (iso: string) => ({ dueAt: new Date(iso) });

describe("weekStrip", () => {
  it("lists Monday to Sunday of the current week with the due count per day", () => {
    // The design's example: Monday Oct 26, due Tue x2, Thu x1, Fri x2.
    const strip = weekStrip(
      [
        due("2026-10-27T10:00:00Z"),
        due("2026-10-27T23:59:00Z"),
        due("2026-10-29T23:59:00Z"),
        due("2026-10-30T09:00:00Z"),
        due("2026-10-30T23:59:00Z"),
        due("2026-11-09T23:59:00Z"), // a later week: not shown
      ],
      new Date("2026-10-26T12:00:00Z"),
      UTC,
    );
    expect(strip.map((d) => d.date)).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
    expect(strip.map((d) => d.day)).toEqual([26, 27, 28, 29, 30, 31, 1]);
    expect(strip.map((d) => d.count)).toEqual([0, 2, 0, 1, 2, 0, 0]);
  });

  it("highlights today only", () => {
    const strip = weekStrip([], new Date("2026-10-28T12:00:00Z"), UTC);
    expect(strip.filter((d) => d.isToday).map((d) => d.date)).toEqual(["2026-10-28"]);
  });

  it("starts the week on Monday even when today is Sunday", () => {
    const strip = weekStrip([], new Date("2026-11-01T12:00:00Z"), UTC);
    expect(strip[0].date).toBe("2026-10-26");
    expect(strip[6]).toMatchObject({ date: "2026-11-01", isToday: true });
  });

  it("uses the student's timezone to place today and each due day", () => {
    // 03:00Z on Monday Oct 26 is still Sunday evening in New York: the week is the previous one.
    const now = new Date("2026-10-26T03:00:00Z");
    const strip = weekStrip([due("2026-10-26T03:30:00Z")], now, NY);
    expect(strip[0].date).toBe("2026-10-19");
    expect(strip[6]).toMatchObject({ date: "2026-10-25", count: 1, isToday: true });
  });

  it("counts work already past due earlier today", () => {
    const strip = weekStrip([due("2026-10-26T08:00:00Z")], new Date("2026-10-26T12:00:00Z"), UTC);
    expect(strip[0].count).toBe(1);
  });
});
