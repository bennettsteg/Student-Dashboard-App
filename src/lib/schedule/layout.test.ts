import { describe, expect, it } from "vitest";

import { formatHourLabel, formatTimeOfDay, layoutDay, placeBlock } from "./layout";

const PX = 48; // pixels per hour

describe("placeBlock", () => {
  it("positions a class from the 7 AM top of the grid", () => {
    // 9:00-10:30 starts 2h below 7 AM and lasts 1.5h.
    expect(placeBlock("09:00", "10:30", PX)).toEqual({ top: 96, height: 72 });
  });

  it("puts a 7 AM class at the very top", () => {
    expect(placeBlock("07:00", "08:00", PX)).toEqual({ top: 0, height: 48 });
  });

  it("clips a class that starts before 7 AM", () => {
    expect(placeBlock("06:00", "08:00", PX)).toEqual({ top: 0, height: 48 });
  });

  it("clips a class that runs past 10 PM", () => {
    // 21:00 is 14h below 7 AM; only the hour up to 22:00 is on the grid.
    expect(placeBlock("21:00", "23:00", PX)).toEqual({ top: 672, height: 48 });
  });

  it("gives a very short class a readable minimum height", () => {
    expect(placeBlock("08:00", "08:10", PX)).toEqual({ top: 48, height: 20 });
  });

  it("omits a class that lies entirely outside 7 AM-10 PM", () => {
    expect(placeBlock("05:00", "06:30", PX)).toBeNull();
    expect(placeBlock("22:00", "23:00", PX)).toBeNull();
  });

  it("omits a class that ends before it starts", () => {
    expect(placeBlock("10:00", "09:00", PX)).toBeNull();
  });
});

describe("layoutDay", () => {
  const course = (id: string, startTime: string, endTime: string) => ({ id, startTime, endTime });

  it("gives non-overlapping classes the full column width", () => {
    const blocks = layoutDay([course("a", "09:00", "10:00"), course("b", "10:00", "11:00")], PX);
    expect(blocks).toEqual([
      { id: "a", top: 96, height: 48, column: 0, columns: 1 },
      { id: "b", top: 144, height: 48, column: 0, columns: 1 },
    ]);
  });

  it("places overlapping classes side by side", () => {
    const blocks = layoutDay(
      [course("b", "10:00", "11:00"), course("a", "09:00", "10:30"), course("c", "11:00", "12:00")],
      PX,
    );
    const byId = Object.fromEntries(blocks.map((b) => [b.id, b]));
    expect(byId.a).toMatchObject({ column: 0, columns: 2 });
    expect(byId.b).toMatchObject({ column: 1, columns: 2 });
    // c only touches b, so it is in a new cluster of its own.
    expect(byId.c).toMatchObject({ column: 0, columns: 1 });
  });

  it("drops classes that fall outside the grid", () => {
    expect(layoutDay([course("early", "05:00", "06:00")], PX)).toEqual([]);
  });
});

describe("labels", () => {
  it("formats hour labels in 12-hour time", () => {
    expect(formatHourLabel(7)).toBe("7 AM");
    expect(formatHourLabel(12)).toBe("12 PM");
    expect(formatHourLabel(13)).toBe("1 PM");
    expect(formatHourLabel(22)).toBe("10 PM");
  });

  it("formats a class time of day", () => {
    expect(formatTimeOfDay("09:05")).toBe("9:05 AM");
    expect(formatTimeOfDay("00:30")).toBe("12:30 AM");
    expect(formatTimeOfDay("13:45")).toBe("1:45 PM");
  });
});
