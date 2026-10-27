import { describe, expect, it } from "vitest";

import { parseCategoryInput, parseEntryInput } from "./validation";

describe("parseCategoryInput", () => {
  it("accepts a name and a weight, trimming the name", () => {
    expect(parseCategoryInput({ name: "  Exams ", weight: 40 })).toEqual({
      ok: true,
      value: { name: "Exams", weight: 40 },
    });
  });

  it("allows decimal weights and the 0 and 100 bounds", () => {
    expect(parseCategoryInput({ name: "A", weight: 12.5 }).ok).toBe(true);
    expect(parseCategoryInput({ name: "A", weight: 0 }).ok).toBe(true);
    expect(parseCategoryInput({ name: "A", weight: 100 }).ok).toBe(true);
  });

  it("rejects a blank name", () => {
    expect(parseCategoryInput({ name: "   ", weight: 10 }).ok).toBe(false);
  });

  it("rejects weights outside 0 to 100 and non-numbers", () => {
    expect(parseCategoryInput({ name: "A", weight: -1 }).ok).toBe(false);
    expect(parseCategoryInput({ name: "A", weight: 100.5 }).ok).toBe(false);
    expect(parseCategoryInput({ name: "A", weight: Number.NaN }).ok).toBe(false);
    expect(parseCategoryInput({ name: "A", weight: Number.POSITIVE_INFINITY }).ok).toBe(false);
  });
});

describe("parseEntryInput", () => {
  const valid = {
    name: " Midterm ",
    categoryId: "cat1",
    pointsEarned: 42.5,
    pointsPossible: 50,
    date: "2026-10-14",
  };

  it("accepts a valid entry, trimming the name and reading the date as UTC midnight", () => {
    expect(parseEntryInput(valid)).toEqual({
      ok: true,
      value: {
        name: "Midterm",
        categoryId: "cat1",
        pointsEarned: 42.5,
        pointsPossible: 50,
        date: new Date("2026-10-14T00:00:00.000Z"),
      },
    });
  });

  it("treats a missing or empty date as no date", () => {
    const withNull = parseEntryInput({ ...valid, date: null });
    const withEmpty = parseEntryInput({ ...valid, date: "" });
    expect(withNull.ok && withNull.value.date).toBeNull();
    expect(withEmpty.ok && withEmpty.value.date).toBeNull();
  });

  it("allows zero and extra-credit earned points", () => {
    expect(parseEntryInput({ ...valid, pointsEarned: 0 }).ok).toBe(true);
    expect(parseEntryInput({ ...valid, pointsEarned: 55 }).ok).toBe(true);
  });

  it("rejects negative earned points", () => {
    expect(parseEntryInput({ ...valid, pointsEarned: -1 }).ok).toBe(false);
  });

  it("requires points possible greater than zero", () => {
    expect(parseEntryInput({ ...valid, pointsPossible: 0 }).ok).toBe(false);
    expect(parseEntryInput({ ...valid, pointsPossible: -5 }).ok).toBe(false);
    expect(parseEntryInput({ ...valid, pointsPossible: Number.NaN }).ok).toBe(false);
  });

  it("rejects a blank name, a missing Category and a malformed date", () => {
    expect(parseEntryInput({ ...valid, name: " " }).ok).toBe(false);
    expect(parseEntryInput({ ...valid, categoryId: "" }).ok).toBe(false);
    expect(parseEntryInput({ ...valid, date: "10/14/2026" }).ok).toBe(false);
    expect(parseEntryInput({ ...valid, date: "2026-02-31" }).ok).toBe(false);
  });
});
