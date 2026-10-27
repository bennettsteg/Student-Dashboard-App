import { describe, expect, it } from "vitest";

import { categoryScore, currentGrade, weightTotal } from "./currentGrade";

function category(weight: number, entries: Array<[earned: number, possible: number]>) {
  return {
    weight,
    entries: entries.map(([pointsEarned, pointsPossible]) => ({ pointsEarned, pointsPossible })),
  };
}

describe("categoryScore", () => {
  it("is total earned over total possible, so larger entries count for more", () => {
    // (10 + 90) / (10 + 100) = 90.909...%, not the 95% a mean of 100% and 90% would give.
    expect(categoryScore(category(1, [[10, 10], [90, 100]]).entries)).toBeCloseTo(
      (100 / 110) * 100,
      10,
    );
  });

  it("is null for a Category with no entries", () => {
    expect(categoryScore([])).toBeNull();
  });

  it("handles fractional points", () => {
    // 7.5 + 2.25 = 9.75 earned of 15 possible = 65%.
    expect(
      categoryScore([
        { pointsEarned: 7.5, pointsPossible: 10 },
        { pointsEarned: 2.25, pointsPossible: 5 },
      ]),
    ).toBeCloseTo(65, 10);
  });
});

describe("currentGrade", () => {
  it("is the weighted average of Category scores when weights total 100", () => {
    const grade = currentGrade([
      category(40, [[80, 100]]), // 80%
      category(30, [[45, 50]]), // 90%
      category(20, [[10, 10]]), // 100%
      category(10, [[0, 5]]), // 0%
    ]);
    // 0.4*80 + 0.3*90 + 0.2*100 + 0.1*0 = 79
    expect(grade).toBeCloseTo(79, 10);
  });

  it("is null when there are no Categories", () => {
    expect(currentGrade([])).toBeNull();
  });

  it("is null when no Category has an entry", () => {
    expect(currentGrade([category(60, []), category(40, [])])).toBeNull();
  });

  it("ignores Categories without entries and rescales the remaining weights to 100", () => {
    const grade = currentGrade([
      category(40, []), // ungraded Exams must not drag the grade to zero
      category(30, [[80, 100]]), // 80%
      category(10, [[100, 100]]), // 100%
    ]);
    // (30*80 + 10*100) / 40 = 85
    expect(grade).toBeCloseTo(85, 10);
  });

  it("is that Category's score when it is the only one with entries, whatever its weight", () => {
    expect(currentGrade([category(25, [[18, 20]]), category(75, [])])).toBeCloseTo(90, 10);
  });

  it("rescales weights that do not total 100", () => {
    // Weights 30 + 30 = 60: both count equally, so the grade is the mean of 100 and 50.
    expect(currentGrade([category(30, [[10, 10]]), category(30, [[5, 10]])])).toBeCloseTo(75, 10);
    // Weights total 150: (100 * 100 + 50 * 40) / 150 = 80.
    expect(currentGrade([category(100, [[10, 10]]), category(50, [[4, 10]])])).toBeCloseTo(80, 10);
  });

  it("handles fractional points and fractional weights", () => {
    const grade = currentGrade([
      category(33.3, [
        [7.5, 10],
        [2.25, 5],
      ]), // 65%
      category(66.7, [[19.5, 20]]), // 97.5%
    ]);
    // (2164.5 + 6503.25) / 100 = 86.6775
    expect(grade).toBeCloseTo(86.6775, 10);
  });

  it("can exceed 100 with extra credit", () => {
    expect(currentGrade([category(100, [[110, 100]])])).toBeCloseTo(110, 10);
  });

  it("is null when the Categories that have entries all have zero weight", () => {
    expect(currentGrade([category(0, [[9, 10]]), category(50, [])])).toBeNull();
  });
});

describe("weightTotal", () => {
  it("sums Category weights, decimals included", () => {
    expect(weightTotal([{ weight: 40 }, { weight: 30.5 }, { weight: 29.5 }])).toBeCloseTo(100, 10);
  });

  it("is 0 for no Categories", () => {
    expect(weightTotal([])).toBe(0);
  });
});
